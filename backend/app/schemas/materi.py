import uuid
from datetime import datetime
from pydantic import BaseModel


class MateriResponse(BaseModel):
    id: uuid.UUID
    guru_id: uuid.UUID
    judul: str
    file_path: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MateriChunkResponse(BaseModel):
    id: uuid.UUID
    materi_id: uuid.UUID
    chunk_index: int
    content: str

    model_config = {"from_attributes": True}
