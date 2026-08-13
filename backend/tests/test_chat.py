from unittest.mock import patch

from fastapi.testclient import TestClient

from app.schemas import FieldValue, LlmReply


class _StubMessage:
    def __init__(self, content: str) -> None:
        self.content = content


class _StubChoice:
    def __init__(self, content: str) -> None:
        self.message = _StubMessage(content)


class _StubCompletionResponse:
    def __init__(self, content: str) -> None:
        self.choices = [_StubChoice(content)]


def test_chat_requires_authentication(client: TestClient):
    response = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "hi"}], "documentType": "", "fields": []},
    )

    assert response.status_code == 401


def test_chat_returns_reply_and_updated_fields(authed_client: TestClient):
    fields = [FieldValue(key="purpose", value="Evaluating a partnership")]
    stub_response = _StubCompletionResponse(
        LlmReply(reply="Got it, thanks!", document_type="mutual-nda", fields=fields).model_dump_json(by_alias=True)
    )

    with patch("app.llm.completion", return_value=stub_response):
        response = authed_client.post(
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
    assert isinstance(body["documentId"], int)


def test_chat_autosaves_and_reuses_the_same_document_id_across_turns(authed_client: TestClient):
    first_reply = _StubCompletionResponse(
        LlmReply(reply="Got it.", document_type="mutual-nda", fields=[]).model_dump_json(by_alias=True)
    )
    with patch("app.llm.completion", return_value=first_reply):
        first = authed_client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "We need an NDA"}], "documentType": "", "fields": []},
        ).json()

    assert first["documentId"] is not None

    fields = [FieldValue(key="governingLaw", value="Delaware")]
    second_reply = _StubCompletionResponse(
        LlmReply(reply="Noted.", document_type="mutual-nda", fields=fields).model_dump_json(by_alias=True)
    )
    with patch("app.llm.completion", return_value=second_reply):
        second = authed_client.post(
            "/api/chat",
            json={
                "messages": [{"role": "user", "content": "Governing law is Delaware"}],
                "documentType": "mutual-nda",
                "fields": [],
                "documentId": first["documentId"],
            },
        ).json()

    assert second["documentId"] == first["documentId"]

    saved = authed_client.get("/api/saved-documents").json()
    assert len(saved) == 1
    assert saved[0]["id"] == first["documentId"]
    assert saved[0]["fields"] == [{"key": "governingLaw", "value": "Delaware"}]


def test_chat_starts_a_new_document_when_the_type_changes_mid_conversation(authed_client: TestClient):
    # User starts drafting a Mutual NDA, then changes their mind and asks for a CSA
    # instead without clicking "New document" - the client still sends the old
    # documentId. That must NOT overwrite the NDA row with CSA data.
    nda_reply = _StubCompletionResponse(
        LlmReply(
            reply="Got it.", document_type="mutual-nda", fields=[FieldValue(key="purpose", value="An NDA deal")]
        ).model_dump_json(by_alias=True)
    )
    with patch("app.llm.completion", return_value=nda_reply):
        nda_result = authed_client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "We need an NDA"}], "documentType": "", "fields": []},
        ).json()

    csa_reply = _StubCompletionResponse(
        LlmReply(
            reply="Switched to a CSA.", document_type="csa", fields=[FieldValue(key="provider", value="Acme Inc")]
        ).model_dump_json(by_alias=True)
    )
    with patch("app.llm.completion", return_value=csa_reply):
        csa_result = authed_client.post(
            "/api/chat",
            json={
                "messages": [{"role": "user", "content": "Actually, make it a CSA instead"}],
                "documentType": "mutual-nda",
                "fields": nda_result["fields"],
                "documentId": nda_result["documentId"],
            },
        ).json()

    assert csa_result["documentId"] != nda_result["documentId"]

    saved = {doc["id"]: doc for doc in authed_client.get("/api/saved-documents").json()}
    assert len(saved) == 2
    assert saved[nda_result["documentId"]]["documentType"] == "mutual-nda"
    assert saved[nda_result["documentId"]]["fields"] == [{"key": "purpose", "value": "An NDA deal"}]
    assert saved[csa_result["documentId"]]["documentType"] == "csa"


def test_chat_does_not_save_anything_until_a_document_type_is_confirmed(authed_client: TestClient):
    stub_response = _StubCompletionResponse(
        LlmReply(reply="What do you need?", document_type="", fields=[]).model_dump_json(by_alias=True)
    )

    with patch("app.llm.completion", return_value=stub_response):
        response = authed_client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "hi"}], "documentType": "", "fields": []},
        )

    assert response.json()["documentId"] is None
    assert authed_client.get("/api/saved-documents").json() == []


def test_chat_handles_llm_failure(authed_client: TestClient):
    from litellm.exceptions import RateLimitError

    error = RateLimitError(message="rate limited", llm_provider="openrouter", model="gpt-oss-120b")

    with patch("app.llm.completion", side_effect=error):
        response = authed_client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "hi"}], "documentType": "", "fields": []},
        )

    assert response.status_code == 502


def test_chat_handles_malformed_structured_output(authed_client: TestClient):
    stub_response = _StubCompletionResponse("not valid json")

    with patch("app.llm.completion", return_value=stub_response):
        response = authed_client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "hi"}], "documentType": "", "fields": []},
        )

    assert response.status_code == 502


def test_chat_prompt_includes_active_document_fields_and_known_values(authed_client: TestClient):
    fields = [FieldValue(key="jurisdiction", value="New Castle, DE")]
    stub_response = _StubCompletionResponse(
        LlmReply(reply="Noted.", document_type="mutual-nda", fields=fields).model_dump_json(by_alias=True)
    )

    with patch("app.llm.completion", return_value=stub_response) as mock_completion:
        response = authed_client.post(
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


def test_chat_drops_stale_fields_from_a_previous_document_type(authed_client: TestClient):
    # Client sends CSA-shaped fields but is now asking about mutual-nda (e.g. after
    # switching document types mid-conversation) - the stale "provider"/"customer"
    # keys don't belong to mutual-nda's field list and must not reach the prompt.
    stub_response = _StubCompletionResponse(
        LlmReply(reply="Got it.", document_type="mutual-nda", fields=[]).model_dump_json(by_alias=True)
    )

    with patch("app.llm.completion", return_value=stub_response) as mock_completion:
        response = authed_client.post(
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


def test_chat_drops_fields_the_model_returns_for_the_wrong_document(authed_client: TestClient):
    # Even if the model's own structured output includes keys that don't belong to
    # the document type it settled on, the response returned to the client must not
    # carry them - the wire schema has no per-document shape to enforce this itself.
    mismatched_fields = [
        FieldValue(key="purpose", value="Evaluating a partnership"),
        FieldValue(key="subscriptionPeriod", value="12 months"),
    ]
    stub_response = _StubCompletionResponse(
        LlmReply(reply="Got it.", document_type="mutual-nda", fields=mismatched_fields).model_dump_json(
            by_alias=True
        )
    )

    with patch("app.llm.completion", return_value=stub_response):
        response = authed_client.post(
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


def test_chat_prompt_lists_full_catalog_when_no_document_type_chosen(authed_client: TestClient):
    stub_response = _StubCompletionResponse(
        LlmReply(reply="What kind of agreement do you need?", document_type="", fields=[]).model_dump_json(
            by_alias=True
        )
    )

    with patch("app.llm.completion", return_value=stub_response) as mock_completion:
        response = authed_client.post(
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
