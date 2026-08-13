"""Persists the current (documentType, fields) state of a chat as the conversation
progresses, so a user can look back at documents they've previously drafted."""

import json

from app.db import get_connection
from app.schemas import FieldValue, SavedDocumentSummary


def upsert_saved_document(user_id: int, document_id: int | None, document_type: str, fields: list[FieldValue]) -> int:
    fields_json = json.dumps({f.key: f.value for f in fields})

    with get_connection() as conn:
        if document_id is not None:
            cursor = conn.execute(
                "UPDATE saved_documents SET fields = ?, updated_at = datetime('now') "
                "WHERE id = ? AND user_id = ? AND document_type = ?",
                (fields_json, document_id, user_id, document_type),
            )
            conn.commit()
            if cursor.rowcount > 0:
                return document_id

        # No document_id was given, it didn't belong to this user (e.g. stale client
        # state), or the conversation switched to a different document type since
        # that id was created - start a new row rather than overwriting a different
        # document or silently failing.
        cursor = conn.execute(
            "INSERT INTO saved_documents (user_id, document_type, fields) VALUES (?, ?, ?)",
            (user_id, document_type, fields_json),
        )
        conn.commit()
        new_id = cursor.lastrowid
        assert new_id is not None
        return new_id


def list_saved_documents(user_id: int) -> list[SavedDocumentSummary]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, document_type, fields, created_at, updated_at FROM saved_documents "
            "WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,),
        ).fetchall()

    return [
        SavedDocumentSummary(
            id=row["id"],
            document_type=row["document_type"],
            fields=[FieldValue(key=k, value=v) for k, v in json.loads(row["fields"]).items()],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
        for row in rows
    ]
