import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.galat import galat_validasi


class PaketUjianCreate(BaseModel):
    judul: str
    butir_ids: list[uuid.UUID]
    durasi_menit: int = 60


class RakitOtomatisRequest(BaseModel):
    jumlah_butir: int = Field(ge=1, le=200)
    distribusi_bloom: dict[str, int]
    cakupan_bab: str | None = Field(default=None, max_length=2000)
    target_bobot: int | None = Field(default=None, ge=1, le=100000)

    @field_validator("cakupan_bab")
    @classmethod
    def rapikan_cakupan(cls, v: str | None) -> str | None:
        return (v or "").strip() or None

    @model_validator(mode="after")
    def validasi_distribusi(self):
        if sum(self.distribusi_bloom.values()) != 100:
            raise galat_validasi("validasi_ujian_total_bloom", "Total distribusi Bloom harus 100%")
        if any(k not in {"C1", "C2", "C3", "C4", "C5", "C6"} for k in self.distribusi_bloom):
            raise galat_validasi("validasi_ujian_bloom_tidak_valid", "Level Bloom tidak valid")
        if any(v < 0 for v in self.distribusi_bloom.values()):
            raise galat_validasi("validasi_ujian_persen_negatif", "Persentase Bloom tidak boleh negatif")
        return self


class RakitOtomatisResponse(BaseModel):
    butir_ids: list[uuid.UUID]
    total_bobot: int
    per_level: dict[str, int]
    kekurangan: dict[str, int]
    kurang_total: int
    ada_cakupan: bool = False
    cocok_cakupan: int = 0
    target_bobot: int | None = None
    selisih_bobot: int | None = None


class PaketUjianTerbitkan(BaseModel):
    waktu_mulai: datetime
    waktu_selesai: datetime
    rilis_hasil: Literal["otomatis", "manual"] = "otomatis"


class RilisHasilRequest(BaseModel):
    dirilis: bool


class PaketUjianButirResponse(BaseModel):
    butir_id: uuid.UUID
    urutan: int

    model_config = {"from_attributes": True}


class PaketUjianResponse(BaseModel):
    id: uuid.UUID
    guru_id: uuid.UUID
    judul: str
    status: str
    kode_akses: str | None
    waktu_mulai: datetime | None
    waktu_selesai: datetime | None
    durasi_menit: int
    created_at: datetime
    rilis_hasil: str = "otomatis"
    hasil_dirilis: bool = True
    hasil_dirilis_pada: datetime | None = None
    butir_list: list[PaketUjianButirResponse] = []

    model_config = {"from_attributes": True}
