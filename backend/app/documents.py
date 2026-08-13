"""Parses catalog.json + templates/*.md into a registry of document type definitions.

Every template marks its fillable concepts with inline
``<span class="X_link">Label</span>`` markers (X is coverpage/keyterms/orderform/
businessterms depending on the document). This module extracts those markers as a
field list per document and rewrites the surrounding clause text into the same
``{{fieldKey}}`` token convention used by the renderer, so one generic mechanism
covers all document types instead of one hand-transcribed model per document.
"""

import json
import re
from functools import lru_cache
from pathlib import Path

from app.schemas import CamelModel

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
CATALOG_PATH = REPO_ROOT / "catalog.json"
TEMPLATES_DIR = REPO_ROOT / "templates"

# Documents that supplement a separate base agreement rather than standing alone.
REQUIRES_BASE_AGREEMENT = {"BAA.md", "AI-Addendum.md", "DPA.md", "SLA.md"}

# The Mutual NDA's companion cover page isn't a document type of its own - its
# fields are derived from Mutual-NDA.md's own coverpage_link markers instead.
SKIP_FILENAMES = {"Mutual-NDA-coverpage.md"}

PARTY_ROLE_WORDS = {
    "provider",
    "customer",
    "partner",
    "company",
    "discloser",
    "recipient",
    "disclosing party",
    "receiving party",
}

_LINK_PATTERN = re.compile(r'<span\b[^>]*\bclass="(\w+)_link"[^>]*>([^<]*)</span>')
_HEADER3_PATTERN = re.compile(r'<span\b[^>]*\bclass="header_3"[^>]*>(.*?)</span>')
_ANY_SPAN_PATTERN = re.compile(r"<span\b[^>]*>(.*?)</span>", re.DOTALL)
_STRAY_SPAN_TAG_PATTERN = re.compile(r"</?span[^>]*>")
_TOP_LEVEL_ITEM_PATTERN = re.compile(r"^(\d+)\.\s+", re.MULTILINE)
_LEADING_HEADER2_PATTERN = re.compile(r'^\s*<span\b[^>]*\bclass="header_2"[^>]*>(.*?)</span>\s*')
_LEADING_BOLD_PATTERN = re.compile(r"^\s*\*\*(.+?)\*\*\.?\s*")
_TRAILING_ATTRIBUTION_PATTERN = re.compile(r"\n+Common Paper .+$", re.DOTALL)
_POSSESSIVE_SUFFIX_PATTERN = re.compile(r"[’']s?$")


class DocumentField(CamelModel):
    key: str
    label: str


class Clause(CamelModel):
    number: int
    title: str
    body: str


class DocumentDefinition(CamelModel):
    id: str
    name: str
    description: str
    requires_base_agreement: bool
    fields: list[DocumentField]
    clauses: list[Clause]


def _normalize_label(raw: str) -> str:
    return _POSSESSIVE_SUFFIX_PATTERN.sub("", raw.strip()).strip()


def _possessive_suffix(raw: str) -> str:
    match = _POSSESSIVE_SUFFIX_PATTERN.search(raw.strip())
    return match.group(0) if match else ""


def _slugify(label: str) -> str:
    words = re.findall(r"[A-Za-z0-9]+", label)
    if not words:
        return "field"
    first, *rest = words
    return first.lower() + "".join(w.capitalize() for w in rest)


def _extract_fields(body: str) -> tuple[list[DocumentField], dict[str, str]]:
    """Returns (ordered unique fields, map of lowercased normalized label -> key)."""
    fields: list[DocumentField] = []
    label_to_key: dict[str, str] = {}
    for _link_class, raw_label in _LINK_PATTERN.findall(body):
        label = _normalize_label(raw_label)
        dedup_key = label.lower()
        if not label or dedup_key in label_to_key:
            continue
        key = _slugify(label)
        label_to_key[dedup_key] = key
        fields.append(DocumentField(key=key, label=label))

    if not any(f.label.lower() in PARTY_ROLE_WORDS for f in fields):
        fields.append(DocumentField(key="partyOneName", label="Party 1 Name & Contact"))
        fields.append(DocumentField(key="partyTwoName", label="Party 2 Name & Contact"))

    return fields, label_to_key


def _tokenize_links(body: str, label_to_key: dict[str, str]) -> str:
    def replace(match: re.Match[str]) -> str:
        raw_label = match.group(2)
        key = label_to_key.get(_normalize_label(raw_label).lower())
        if key is None:
            return raw_label
        return f"{{{{{key}}}}}{_possessive_suffix(raw_label)}"

    return _LINK_PATTERN.sub(replace, body)


def _clean_markup(text: str) -> str:
    text = _HEADER3_PATTERN.sub(lambda m: f"**{m.group(1)}**", text)
    text = _ANY_SPAN_PATTERN.sub(lambda m: m.group(1), text)
    return _STRAY_SPAN_TAG_PATTERN.sub("", text)


def _extract_title(section_text: str, number: int) -> tuple[str, str]:
    """Returns (title, remaining body-text-with-title-removed)."""
    match = _LEADING_HEADER2_PATTERN.match(section_text)
    if match:
        return _clean_markup(match.group(1)).strip(), section_text[match.end() :]

    match = _LEADING_BOLD_PATTERN.match(section_text)
    if match:
        return match.group(1).strip(), section_text[match.end() :]

    first_line, _, rest = section_text.partition("\n")
    candidate = _clean_markup(first_line).strip()
    if candidate and len(candidate) <= 60:
        return candidate, rest

    return f"Section {number}", section_text


def _split_clauses(body: str, label_to_key: dict[str, str]) -> list[Clause]:
    matches = list(_TOP_LEVEL_ITEM_PATTERN.finditer(body))
    clauses: list[Clause] = []
    for i, match in enumerate(matches):
        number = int(match.group(1))
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        title, remaining = _extract_title(body[match.end() : end], number)
        tokenized = _tokenize_links(remaining, label_to_key)
        clauses.append(Clause(number=number, title=title, body=_clean_markup(tokenized).strip()))
    return clauses


def _document_id(filename: str) -> str:
    stem = filename.rsplit(".", 1)[0]
    return "-".join(w.lower() for w in re.findall(r"[A-Za-z0-9]+", stem))


def _parse_document(filename: str) -> tuple[list[DocumentField], list[Clause]]:
    raw_text = (TEMPLATES_DIR / filename).read_text(encoding="utf-8")
    raw_text = _TRAILING_ATTRIBUTION_PATTERN.sub("", raw_text)
    fields, label_to_key = _extract_fields(raw_text)
    clauses = _split_clauses(raw_text, label_to_key)
    return fields, clauses


@lru_cache(maxsize=1)
def load_document_registry() -> dict[str, DocumentDefinition]:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    registry: dict[str, DocumentDefinition] = {}

    for entry in catalog["templates"]:
        filename = entry["filename"]
        if filename in SKIP_FILENAMES:
            continue

        fields, clauses = _parse_document(filename)
        doc_id = _document_id(filename)
        registry[doc_id] = DocumentDefinition(
            id=doc_id,
            name=entry["name"],
            description=entry["description"],
            requires_base_agreement=filename in REQUIRES_BASE_AGREEMENT,
            fields=fields,
            clauses=clauses,
        )

    return registry
