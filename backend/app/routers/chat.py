import pydantic
from fastapi import APIRouter, Depends, HTTPException
from openai import APIError as OpenAIAPIError

from app.auth import CurrentUser, get_current_user
from app.llm import get_chat_response
from app.saved_documents import upsert_saved_document
from app.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest, current_user: CurrentUser = Depends(get_current_user)) -> ChatResponse:
    try:
        reply = get_chat_response(request)
    except OpenAIAPIError as exc:
        raise HTTPException(
            status_code=502, detail="The assistant is unavailable right now. Please try again."
        ) from exc
    except pydantic.ValidationError as exc:
        raise HTTPException(
            status_code=502, detail="The assistant returned an unexpected response. Please try again."
        ) from exc

    document_id = request.document_id
    if reply.document_type:
        document_id = upsert_saved_document(current_user.id, document_id, reply.document_type, reply.fields)

    return ChatResponse(
        reply=reply.reply,
        document_type=reply.document_type,
        fields=reply.fields,
        document_id=document_id,
    )
