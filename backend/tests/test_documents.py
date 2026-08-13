import json
import os
import re
import subprocess
import sys
from pathlib import Path

from fastapi.testclient import TestClient

from app.documents import load_document_registry
from app.main import app

client = TestClient(app)


def test_registry_covers_all_catalog_entries_except_mutual_nda_coverpage():
    registry = load_document_registry()
    assert len(registry) == 11
    assert "mutual-nda-coverpage" not in registry


def test_registry_marks_riders_as_requiring_a_base_agreement():
    registry = load_document_registry()
    assert registry["ai-addendum"].requires_base_agreement is True
    assert registry["baa"].requires_base_agreement is True
    assert registry["dpa"].requires_base_agreement is True
    assert registry["sla"].requires_base_agreement is True
    assert registry["mutual-nda"].requires_base_agreement is False
    assert registry["csa"].requires_base_agreement is False


def test_every_document_has_fields_and_clauses_with_no_leftover_span_tags():
    registry = load_document_registry()
    for doc in registry.values():
        assert doc.fields, f"{doc.id} has no fields"
        assert doc.clauses, f"{doc.id} has no clauses"
        for clause in doc.clauses:
            assert "<span" not in clause.body, f"{doc.id} clause {clause.number} leaked a span tag"
            assert "</span>" not in clause.body, f"{doc.id} clause {clause.number} leaked a closing span tag"


def test_every_field_token_referenced_in_clauses_has_a_matching_field():
    registry = load_document_registry()
    for doc in registry.values():
        field_keys = {f.key for f in doc.fields}
        body = " ".join(c.body for c in doc.clauses)
        tokens_used = set(re.findall(r"\{\{(\w+)\}\}", body))
        assert tokens_used <= field_keys, f"{doc.id} references unknown field tokens: {tokens_used - field_keys}"


def test_mutual_nda_gets_synthetic_party_fields_since_it_has_none_in_prose():
    registry = load_document_registry()
    field_keys = {f.key for f in registry["mutual-nda"].fields}
    assert "partyOneName" in field_keys
    assert "partyTwoName" in field_keys


def test_csa_party_fields_come_from_the_template_not_synthesized():
    registry = load_document_registry()
    field_keys = {f.key for f in registry["csa"].fields}
    assert "provider" in field_keys
    assert "customer" in field_keys
    assert "partyOneName" not in field_keys


def test_mutual_nda_does_not_leak_the_trailing_attribution_footer():
    # Only Mutual-NDA.md has a trailing "Common Paper ... free to use under [CC BY
    # 4.0](...)." footer line after its last clause, which must get stripped before
    # parsing rather than becoming part of the last clause's body.
    registry = load_document_registry()
    mutual_nda_text = " ".join(c.body for c in registry["mutual-nda"].clauses)
    assert "free to use under" not in mutual_nda_text
    assert "creativecommons.org" not in mutual_nda_text


def test_prelegal_data_root_env_var_overrides_default_repo_root(tmp_path):
    # This is what actually breaks Docker: documents.py locates catalog.json/templates/
    # via a fixed number of parent-directory climbs from __file__, which is only valid
    # for the local backend/app/documents.py layout. The Docker image copies app/ to a
    # shallower path and never had catalog.json/templates in the build context at all,
    # so PRELEGAL_DATA_ROOT lets the container point this module elsewhere. Runs in a
    # subprocess for a genuinely fresh import - module-level constants can't be
    # re-pointed by reassigning os.environ after the fact.
    (tmp_path / "templates").mkdir()
    (tmp_path / "catalog.json").write_text(
        json.dumps({"templates": [{"name": "Test Doc", "description": "A test.", "filename": "test.md"}]}),
        encoding="utf-8",
    )
    (tmp_path / "templates" / "test.md").write_text(
        '# Test\n\n1. <span class="header_2">Intro</span>\n'
        '    1. This mentions <span class="coverpage_link">Provider</span>.\n',
        encoding="utf-8",
    )

    result = subprocess.run(
        [sys.executable, "-c", "from app.documents import load_document_registry; print(sorted(load_document_registry()))"],
        cwd=Path(__file__).resolve().parent.parent,
        env={**os.environ, "PRELEGAL_DATA_ROOT": str(tmp_path)},
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert "'test'" in result.stdout


def test_list_documents_endpoint_returns_all_documents():
    response = client.get("/api/documents")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 11
    mutual_nda = next(d for d in body if d["id"] == "mutual-nda")
    assert mutual_nda["requiresBaseAgreement"] is False
    assert any(f["key"] == "purpose" for f in mutual_nda["fields"])
