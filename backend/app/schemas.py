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


class ChatResponse(CamelModel):
    reply: str
    document_type: str
    fields: list[FieldValue]
