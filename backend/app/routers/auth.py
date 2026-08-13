import sqlite3

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response

from app.auth import (
    SESSION_COOKIE_NAME,
    CurrentUser,
    create_session,
    delete_session,
    get_current_user,
    hash_password,
    verify_password,
)
from app.db import get_connection
from app.schemas import SignInRequest, SignUpRequest, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

MIN_PASSWORD_LENGTH = 8
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=SESSION_MAX_AGE_SECONDS,
        path="/",
    )


@router.post("/signup", response_model=UserResponse)
def signup(request: SignUpRequest, response: Response) -> UserResponse:
    username = request.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required.")
    if len(request.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=400, detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")

    password_hash = hash_password(request.password)
    with get_connection() as conn:
        try:
            cursor = conn.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (username, password_hash),
            )
            conn.commit()
        except sqlite3.IntegrityError as exc:
            raise HTTPException(status_code=409, detail="That username is already taken.") from exc
        user_id = cursor.lastrowid
        assert user_id is not None

    _set_session_cookie(response, create_session(user_id))
    return UserResponse(id=user_id, username=username)


@router.post("/signin", response_model=UserResponse)
def signin(request: SignInRequest, response: Response) -> UserResponse:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, username, password_hash FROM users WHERE username = ?",
            (request.username.strip(),),
        ).fetchone()

    if row is None or not verify_password(request.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password.")

    _set_session_cookie(response, create_session(row["id"]))
    return UserResponse(id=row["id"], username=row["username"])


@router.post("/signout")
def signout(
    response: Response, session: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME)
) -> dict[str, str]:
    if session is not None:
        delete_session(session)
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"status": "ok"}


@router.get("/me", response_model=UserResponse)
def me(current_user: CurrentUser = Depends(get_current_user)) -> UserResponse:
    return UserResponse(id=current_user.id, username=current_user.username)
