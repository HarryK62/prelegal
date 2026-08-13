from fastapi.testclient import TestClient


def test_signup_creates_user_and_sets_session_cookie(client: TestClient):
    response = client.post("/api/auth/signup", json={"username": "alice", "password": "hunter22"})

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "alice"
    assert "prelegal_session" in response.cookies


def test_signup_rejects_duplicate_username(client: TestClient):
    client.post("/api/auth/signup", json={"username": "alice", "password": "hunter22"})
    response = client.post("/api/auth/signup", json={"username": "alice", "password": "differentpw"})

    assert response.status_code == 409


def test_signup_rejects_short_password(client: TestClient):
    response = client.post("/api/auth/signup", json={"username": "alice", "password": "short"})

    assert response.status_code == 400


def test_signup_rejects_blank_username(client: TestClient):
    response = client.post("/api/auth/signup", json={"username": "   ", "password": "hunter22"})

    assert response.status_code == 400


def test_signin_with_correct_credentials_succeeds(client: TestClient):
    client.post("/api/auth/signup", json={"username": "alice", "password": "hunter22"})
    fresh_client = TestClient(client.app)

    response = fresh_client.post("/api/auth/signin", json={"username": "alice", "password": "hunter22"})

    assert response.status_code == 200
    assert response.json()["username"] == "alice"


def test_signin_with_wrong_password_fails(client: TestClient):
    client.post("/api/auth/signup", json={"username": "alice", "password": "hunter22"})
    fresh_client = TestClient(client.app)

    response = fresh_client.post("/api/auth/signin", json={"username": "alice", "password": "wrongpassword"})

    assert response.status_code == 401


def test_signin_with_unknown_username_fails(client: TestClient):
    response = client.post("/api/auth/signin", json={"username": "nobody", "password": "hunter22"})

    assert response.status_code == 401


def test_me_requires_authentication(client: TestClient):
    response = client.get("/api/auth/me")

    assert response.status_code == 401


def test_me_returns_current_user(authed_client: TestClient):
    response = authed_client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json()["username"] == "testuser"


def test_signout_invalidates_the_session(authed_client: TestClient):
    assert authed_client.get("/api/auth/me").status_code == 200

    signout_response = authed_client.post("/api/auth/signout")
    assert signout_response.status_code == 200

    assert authed_client.get("/api/auth/me").status_code == 401
