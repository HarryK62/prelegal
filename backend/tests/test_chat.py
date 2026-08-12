from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.schemas import ChatResponse, CoverPageFields

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


def test_chat_mutual_nda_returns_reply_and_updated_fields():
    fields = CoverPageFields(purpose="Evaluating a partnership")
    stub_response = _StubCompletionResponse(
        ChatResponse(reply="Got it, thanks!", fields=fields).model_dump_json(by_alias=True)
    )

    with patch("app.llm.completion", return_value=stub_response):
        response = client.post(
            "/api/chat/mutual-nda",
            json={
                "messages": [{"role": "user", "content": "We're evaluating a partnership"}],
                "fields": {},
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Got it, thanks!"
    assert body["fields"]["purpose"] == "Evaluating a partnership"


def test_chat_mutual_nda_handles_llm_failure():
    from litellm.exceptions import RateLimitError

    error = RateLimitError(message="rate limited", llm_provider="openrouter", model="gpt-oss-120b")

    with patch("app.llm.completion", side_effect=error):
        response = client.post(
            "/api/chat/mutual-nda",
            json={"messages": [{"role": "user", "content": "hi"}], "fields": {}},
        )

    assert response.status_code == 502


def test_chat_mutual_nda_handles_malformed_structured_output():
    stub_response = _StubCompletionResponse("not valid json")

    with patch("app.llm.completion", return_value=stub_response):
        response = client.post(
            "/api/chat/mutual-nda",
            json={"messages": [{"role": "user", "content": "hi"}], "fields": {}},
        )

    assert response.status_code == 502


def test_chat_mutual_nda_carries_forward_unmentioned_fields():
    known_fields = CoverPageFields(purpose="Evaluating a partnership", governing_law="Delaware")
    stub_response = _StubCompletionResponse(
        ChatResponse(reply="Noted the jurisdiction.", fields=known_fields).model_dump_json(by_alias=True)
    )

    with patch("app.llm.completion", return_value=stub_response) as mock_completion:
        response = client.post(
            "/api/chat/mutual-nda",
            json={
                "messages": [{"role": "user", "content": "The jurisdiction is New Castle, DE"}],
                "fields": {"purpose": "Evaluating a partnership", "governingLaw": "Delaware"},
            },
        )

    assert response.status_code == 200
    sent_messages = mock_completion.call_args.kwargs["messages"]
    assert "Evaluating a partnership" in sent_messages[0]["content"]
    assert sent_messages[-1]["content"] == "The jurisdiction is New Castle, DE"
