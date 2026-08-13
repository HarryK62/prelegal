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


def test_saved_documents_requires_authentication(client: TestClient):
    response = client.get("/api/saved-documents")

    assert response.status_code == 401


def test_saved_documents_empty_for_a_new_user(authed_client: TestClient):
    response = authed_client.get("/api/saved-documents")

    assert response.status_code == 200
    assert response.json() == []


def test_saved_documents_are_isolated_per_user(client: TestClient):
    client.post("/api/auth/signup", json={"username": "alice", "password": "hunter22"})
    stub_response = _StubCompletionResponse(
        LlmReply(
            reply="Got it.", document_type="mutual-nda", fields=[FieldValue(key="purpose", value="Alice's deal")]
        ).model_dump_json(by_alias=True)
    )
    with patch("app.llm.completion", return_value=stub_response):
        client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "hi"}], "documentType": "", "fields": []},
        )

    bob_client = TestClient(client.app)
    bob_client.post("/api/auth/signup", json={"username": "bob", "password": "hunter22"})

    alice_docs = client.get("/api/saved-documents").json()
    bob_docs = bob_client.get("/api/saved-documents").json()

    assert len(alice_docs) == 1
    assert alice_docs[0]["fields"] == [{"key": "purpose", "value": "Alice's deal"}]
    assert bob_docs == []


def test_a_document_id_belonging_to_another_user_cannot_be_overwritten(client: TestClient):
    client.post("/api/auth/signup", json={"username": "alice", "password": "hunter22"})
    stub_response = _StubCompletionResponse(
        LlmReply(
            reply="Got it.", document_type="mutual-nda", fields=[FieldValue(key="purpose", value="Alice's deal")]
        ).model_dump_json(by_alias=True)
    )
    with patch("app.llm.completion", return_value=stub_response):
        alice_result = client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "hi"}], "documentType": "", "fields": []},
        ).json()
    alice_document_id = alice_result["documentId"]

    bob_client = TestClient(client.app)
    bob_client.post("/api/auth/signup", json={"username": "bob", "password": "hunter22"})
    bob_stub = _StubCompletionResponse(
        LlmReply(
            reply="Got it.", document_type="mutual-nda", fields=[FieldValue(key="purpose", value="Bob's deal")]
        ).model_dump_json(by_alias=True)
    )
    with patch("app.llm.completion", return_value=bob_stub):
        # Bob sends Alice's document_id, e.g. from stale or tampered client state.
        bob_result = bob_client.post(
            "/api/chat",
            json={
                "messages": [{"role": "user", "content": "hi"}],
                "documentType": "",
                "fields": [],
                "documentId": alice_document_id,
            },
        ).json()

    assert bob_result["documentId"] != alice_document_id

    alice_docs = client.get("/api/saved-documents").json()
    assert len(alice_docs) == 1
    assert alice_docs[0]["fields"] == [{"key": "purpose", "value": "Alice's deal"}]
