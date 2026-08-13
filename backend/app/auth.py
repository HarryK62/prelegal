"""Password hashing, session tokens, and the current-user FastAPI dependency."""

import secrets

import bcrypt
from fastapi import Cookie, HTTPException

from app.db import get_connection

SESSION_COOKIE_NAME = "prelegal_session"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    with get_connection() as conn:
        conn.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
        conn.commit()
    return token


def delete_session(token: str) -> None:
    with get_connection() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()


class CurrentUser:
    def __init__(self, id: int, username: str) -> None:
        self.id = id
        self.username = username


def get_current_user(session: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME)) -> CurrentUser:
    if session is None:
        raise HTTPException(status_code=401, detail="Not signed in.")

    with get_connection() as conn:
        row = conn.execute(
            "SELECT users.id, users.username FROM sessions "
            "JOIN users ON users.id = sessions.user_id WHERE sessions.token = ?",
            (session,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=401, detail="Session expired or invalid. Please sign in again.")

    return CurrentUser(id=row["id"], username=row["username"])
