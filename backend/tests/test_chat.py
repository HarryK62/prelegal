from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.schemas import ChatResponse, FieldValue

client = TestClient(app)


class _StubMessage:
    def __init__(self, content: str) -> None:
        self.content = content


class _StubChoice:
    def __init__(self, content: str) -> None:
        self.message = _StubMessage(content)


class _StubCompletionResponse:
    def __init__(self, content: str) -> None:
        self.choices = [_StubChoice(content)]


def test_chat_returns_reply_and_updated_fields():
    fields = [FieldValue(key="purpose", value="Evaluating a partnership")]
    stub_response = _StubCompletionResponse(
        ChatResponse(reply="Got it, thanks!", document_type="mutual-nda", fields=fields).model_dump_json(
            by_alias=True
        )
    )

    with patch("app.llm.completion", return_value=stub_response):
        response = client.post(
            "/api/chat",
            json={
                "messages": [{"role": "user", "content": "We're evaluating a partnership"}],
                "documentType": "mutual-nda",
                "fields": [],
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Got it, thanks!"
    assert body["documentType"] == "mutual-nda"
    assert body["fields"] == [{"key": "purpose", "value": "Evaluating a partnership"}]


def test_chat_handles_llm_failure():
    from litellm.exceptions import RateLimitError

    error = RateLimitError(message="rate limited", llm_provider="openrouter", model="gpt-oss-120b")

    with patch("app.llm.completion", side_effect=error):
        response = client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "hi"}], "documentType": "", "fields": []},
        )

    assert response.status_code == 502


def test_chat_handles_malformed_structured_output():
    stub_response = _StubCompletionResponse("not valid json")

    with patch("app.llm.completion", return_value=stub_response):
        response = client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "hi"}], "documentType": "", "fields": []},
        )

    assert response.status_code == 502


def test_chat_prompt_includes_active_document_fields_and_known_values():
    fields = [FieldValue(key="jurisdiction", value="New Castle, DE")]
    stub_response = _StubCompletionResponse(
        ChatResponse(reply="Noted.", document_type="mutual-nda", fields=fields).model_dump_json(by_alias=True)
    )

    with patch("app.llm.completion", return_value=stub_response) as mock_completion:
        response = client.post(
            "/api/chat",
            json={
                "messages": [{"role": "user", "content": "The jurisdiction is New Castle, DE"}],
                "documentType": "mutual-nda",
                "fields": [{"key": "purpose", "value": "Evaluating a partnership"}],
            },
        )

    assert response.status_code == 200
    sent_messages = mock_completion.call_args.kwargs["messages"]
    system_prompt = sent_messages[0]["content"]
    assert "Mutual Non-Disclosure Agreement" in system_prompt
    assert "Evaluating a partnership" in system_prompt
    assert sent_messages[-1]["content"] == "The jurisdiction is New Castle, DE"


def test_chat_drops_stale_fields_from_a_previous_document_type():
    # Client sends CSA-shaped fields but is now asking about mutual-nda (e.g. after
    # switching document types mid-conversation) - the stale "provider"/"customer"
    # keys don't belong to mutual-nda's field list and must not reach the prompt.
    stub_response = _StubCompletionResponse(
        ChatResponse(reply="Got it.", document_type="mutual-nda", fields=[]).model_dump_json(by_alias=True)
    )

    with patch("app.llm.completion", return_value=stub_response) as mock_completion:
        response = client.post(
            "/api/chat",
            json={
                "messages": [{"role": "user", "content": "Actually I need an NDA instead"}],
                "documentType": "mutual-nda",
                "fields": [
                    {"key": "provider", "value": "Acme Cloud Inc"},
                    {"key": "subscriptionPeriod", "value": "12 months"},
                ],
            },
        )

    assert response.status_code == 200
    system_prompt = mock_completion.call_args.kwargs["messages"][0]["content"]
    assert "Acme Cloud Inc" not in system_prompt
    assert "subscriptionPeriod" not in system_prompt


def test_chat_drops_fields_the_model_returns_for_the_wrong_document():
    # Even if the model's own structured output includes keys that don't belong to
    # the document type it settled on, the response returned to the client must not
    # carry them - the wire schema has no per-document shape to enforce this itself.
    mismatched_fields = [
        FieldValue(key="purpose", value="Evaluating a partnership"),
        FieldValue(key="subscriptionPeriod", value="12 months"),
    ]
    stub_response = _StubCompletionResponse(
        ChatResponse(reply="Got it.", document_type="mutual-nda", fields=mismatched_fields).model_dump_json(
            by_alias=True
        )
    )

    with patch("app.llm.completion", return_value=stub_response):
        response = client.post(
            "/api/chat",
            json={
                "messages": [{"role": "user", "content": "We're evaluating a partnership"}],
                "documentType": "mutual-nda",
                "fields": [],
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["fields"] == [{"key": "purpose", "value": "Evaluating a partnership"}]


def test_chat_prompt_lists_full_catalog_when_no_document_type_chosen():
    stub_response = _StubCompletionResponse(
        ChatResponse(reply="What kind of agreement do you need?", document_type="", fields=[]).model_dump_json(
            by_alias=True
        )
    )

    with patch("app.llm.completion", return_value=stub_response) as mock_completion:
        response = client.post(
            "/api/chat",
            json={
                "messages": [{"role": "user", "content": "I need something for hiring a contractor"}],
                "documentType": "",
                "fields": [],
            },
        )

    assert response.status_code == 200
    system_prompt = mock_completion.call_args.kwargs["messages"][0]["content"]
    assert "mutual-nda" in system_prompt
    assert "ai-addendum" in system_prompt
    assert "supplements a separate base agreement" in system_prompt
