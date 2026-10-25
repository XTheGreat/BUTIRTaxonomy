import uuid
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator

LEVEL_BLOOM = {"C1", "C2", "C3", "C4", "C5", "C6"}
MAKS_BUTIR = 50


class KisiKisiCreate(BaseModel):
    jumlah_butir: int = Field(ge=1, le=MAKS_BUTIR)
    distribusi_bloom: dict[str, int]
    cakupan_bab: str | None = Field(default=None, max_length=2000)
    nama: str | None = Field(default=None, max_length=255)
    materi_ids: list[uuid.UUID] = Field(min_length=1)

    @field_validator("nama")
    @classmethod
    def rapikan_nama(cls, v: str | None) -> str | None:
        v = (v or "").strip()
        return v or None

    @field_validator("cakupan_bab")
    @classmethod
    def rapikan_cakupan(cls, v: str | None) -> str | None:
        v = (v or "").strip()
        return v or None

    @field_validator("materi_ids")
    @classmethod
    def materi_unik(cls, v: list[uuid.UUID]) -> list[uuid.UUID]:
        return list(dict.fromkeys(v))

    @model_validator(mode="after")
    def validate_bloom_total(self):
        for key, nilai in self.distribusi_bloom.items():
            if key not in LEVEL_BLOOM:
                raise ValueError(f"Level Bloom tidak valid: {key}")
            if nilai < 0:
                raise ValueError(f"Persentase {key} tidak boleh negatif")
        total = sum(self.distribusi_bloom.values())
        if total != 100:
            raise ValueError(f"Total distribusi Bloom harus 100%, saat ini {total}%")
        return self


class CekCakupanRequest(BaseModel):
    materi_ids: list[uuid.UUID] = Field(min_length=1)
    cakupan_bab: str | None = Field(default=None, max_length=2000)


class KisiKisiResponse(BaseModel):
    id: uuid.UUID
    guru_id: uuid.UUID
    jumlah_butir: int
    distribusi_bloom: dict[str, int]
    cakupan_bab: str | None
    nama: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MateriRingkas(BaseModel):
    id: uuid.UUID
    judul: str

    model_config = {"from_attributes": True}


class KisiKisiRingkas(KisiKisiResponse):
    materi: list[MateriRingkas] = []
    butir_dibuat: int = 0
    butir_berjalan: int = 0
