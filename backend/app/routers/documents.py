from fastapi import APIRouter

from app.documents import DocumentDefinition, load_document_registry

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", response_model=list[DocumentDefinition])
def list_documents() -> list[DocumentDefinition]:
    return list(load_document_registry().values())
