from fastapi import APIRouter, Depends

from app.auth import CurrentUser, get_current_user
from app.saved_documents import list_saved_documents
from app.schemas import SavedDocumentSummary

router = APIRouter(prefix="/api/saved-documents", tags=["saved-documents"])


@router.get("", response_model=list[SavedDocumentSummary])
def list_mine(current_user: CurrentUser = Depends(get_current_user)) -> list[SavedDocumentSummary]:
    return list_saved_documents(current_user.id)
