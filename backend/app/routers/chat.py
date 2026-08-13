import pydantic
from fastapi import APIRouter, HTTPException
from openai import APIError as OpenAIAPIError

from app.llm import get_chat_response
from app.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    try:
        return get_chat_response(request)
    except OpenAIAPIError as exc:
        raise HTTPException(
            status_code=502, detail="The assistant is unavailable right now. Please try again."
        ) from exc
    except pydantic.ValidationError as exc:
        raise HTTPException(
            status_code=502, detail="The assistant returned an unexpected response. Please try again."
        ) from exc
