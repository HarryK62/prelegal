from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class PartyDetails(CamelModel):
    name: str = ""
    title: str = ""
    company: str = ""
    notice_address: str = ""


class CoverPageFields(CamelModel):
    purpose: str = "Evaluating whether to enter into a business relationship with the other party."
    effective_date: str = ""
    mnda_term_type: Literal["expires", "continues"] = "expires"
    mnda_term_years: int = 1
    confidentiality_term_type: Literal["years", "perpetuity"] = "years"
    confidentiality_term_years: int = 1
    governing_law: str = ""
    jurisdiction: str = ""
    party_one: PartyDetails = Field(default_factory=PartyDetails)
    party_two: PartyDetails = Field(default_factory=PartyDetails)


class ChatTurn(CamelModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(CamelModel):
    messages: list[ChatTurn]
    fields: CoverPageFields = Field(default_factory=CoverPageFields)


class ChatResponse(CamelModel):
    reply: str
    fields: CoverPageFields
