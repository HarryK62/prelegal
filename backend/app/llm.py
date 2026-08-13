import json
from datetime import date

from litellm import completion

from app.documents import DocumentDefinition, load_document_registry
from app.schemas import ChatRequest, ChatResponse, FieldValue

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

INSTRUCTIONS = """
You are a friendly legal-intake assistant for a platform that drafts legal agreements
from a fixed catalog of templates. Have a natural, free-form conversation with the
user. Your job has two stages:

1. Figure out which ONE of the available document types (listed below) the user
   needs. If nothing they've described matches any available document, say so plainly
   and suggest whichever available document type is the closest fit - don't pretend we
   can draft something we don't have a template for. If the best-fitting document type
   is marked "(supplements a separate base agreement)" below, you MUST explain that it
   isn't a standalone agreement and ask whether the user wants you to also draft a
   suitable base agreement, or already has one, BEFORE setting documentType to that
   rider document - do this even if the user firmly insists they only want the rider,
   or names it by its exact catalog name. Only set documentType to a rider document
   once this dependency has been raised at least once and the user has responded to
   it (e.g. confirming they have a base agreement already, or that they want to
   proceed with just the rider anyway).
2. Once the user has confirmed a document type, collect the value for each of its
   fields (listed below, once chosen) through natural conversation, a couple at a time.
   Explain briefly what a field means if the user seems unsure. Do not ask about fields
   that already have a value unless the user brings it up or wants to change it.

Return your response as structured JSON with:
- reply: what to say to the user next
- documentType: the id of the confirmed document type, or "" if not yet determined
- fields: the FULL current set of field key/value pairs for the confirmed document
  type (empty list if no document type is confirmed yet). Always carry forward values
  you already know unchanged, and only update the ones the latest message addressed.
  Never invent values the user hasn't given you.

Today's date is {today}. Use this to resolve relative dates like "today" or "next
Monday" - always write dates back as ISO (YYYY-MM-DD).
""".strip()


def _describe_catalog(registry: dict[str, DocumentDefinition]) -> str:
    lines = ["Available document types:"]
    for doc in registry.values():
        suffix = " (supplements a separate base agreement)" if doc.requires_base_agreement else ""
        lines.append(f"- {doc.id}: {doc.name}{suffix} - {doc.description}")
    return "\n".join(lines)


def _describe_active_document(doc: DocumentDefinition, known_fields: str) -> str:
    field_list = "\n".join(f"- {f.key}: {f.label}" for f in doc.fields)
    return (
        f"\nThe user has confirmed they want: {doc.name} (documentType: {doc.id}).\n"
        f"Its fields are:\n{field_list}\n\nFields known so far (JSON):\n{known_fields}"
    )


def _fields_for_document(fields: list[FieldValue], doc: DocumentDefinition) -> list[FieldValue]:
    """Drops any field whose key doesn't belong to this document - guards against
    stale keys surviving a document-type switch mid-conversation, since the wire
    schema is a generic key/value list with no per-document shape to enforce this."""
    valid_keys = {f.key for f in doc.fields}
    return [f for f in fields if f.key in valid_keys]


def build_system_prompt(request: ChatRequest, registry: dict[str, DocumentDefinition]) -> str:
    today = date.today().isoformat()
    prompt = f"{INSTRUCTIONS.format(today=today)}\n\n{_describe_catalog(registry)}"

    active_doc = registry.get(request.document_type)
    if active_doc is not None:
        known_fields = _fields_for_document(request.fields, active_doc)
        known_fields_json = json.dumps([{"key": f.key, "value": f.value} for f in known_fields])
        prompt += _describe_active_document(active_doc, known_fields_json)

    return prompt


def get_chat_response(request: ChatRequest) -> ChatResponse:
    registry = load_document_registry()
    messages = [{"role": "system", "content": build_system_prompt(request, registry)}]
    messages.extend({"role": turn.role, "content": turn.content} for turn in request.messages)

    response = completion(
        model=MODEL,
        messages=messages,
        response_format=ChatResponse,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    result = ChatResponse.model_validate_json(response.choices[0].message.content)

    active_doc = registry.get(result.document_type)
    result.fields = _fields_for_document(result.fields, active_doc) if active_doc is not None else []
    return result
