from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class FieldValue(CamelModel):
    key: str
    value: str


class ChatTurn(CamelModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(CamelModel):
    messages: list[ChatTurn]
    document_type: str = ""
    fields: list[FieldValue] = Field(default_factory=list)
    document_id: int | None = None


class LlmReply(CamelModel):
    """What the LLM itself produces via structured outputs - document_id is a
    server-side persistence concern the model has no basis to reason about, so it's
    added separately once the reply is used to build the actual API response."""

    reply: str
    document_type: str
    fields: list[FieldValue]


class ChatResponse(CamelModel):
    reply: str
    document_type: str
    fields: list[FieldValue]
    document_id: int | None = None


class SignUpRequest(CamelModel):
    username: str
    password: str


class SignInRequest(CamelModel):
    username: str
    password: str


class UserResponse(CamelModel):
    id: int
    username: str


class SavedDocumentSummary(CamelModel):
    id: int
    document_type: str
    fields: list[FieldValue]
    created_at: str
    updated_at: str
