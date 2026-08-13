import pytest
from fastapi.testclient import TestClient

from app.db import init_db
from app.main import app


@pytest.fixture()
def client() -> TestClient:
    init_db()
    return TestClient(app)


@pytest.fixture()
def authed_client(client: TestClient) -> TestClient:
    client.post("/api/auth/signup", json={"username": "testuser", "password": "hunter22"})
    return client
