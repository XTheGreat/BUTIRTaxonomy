import uuid
from datetime import datetime
from pydantic import BaseModel, model_validator


class ButirSoalResponse(BaseModel):
    id: uuid.UUID
    kisi_kisi_id: uuid.UUID
    pertanyaan: str
    pilihan: dict[str, str]
    kunci_jawaban: str
    pembahasan: str
    level_bloom: str
    level_target: str | None = None
    bobot_poin: int
    status: str
    ronde_saat_ini: int
    prediksi_kesukaran: float | None
    rujukan_chunk_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ButirSoalPublik(BaseModel):
    id: uuid.UUID
    pertanyaan: str
    pilihan: dict[str, str]
    level_bloom: str
    bobot_poin: int

    model_config = {"from_attributes": True}


OPSI_JAWABAN = {"A", "B", "C", "D"}
LEVEL_BLOOM = {"C1", "C2", "C3", "C4", "C5", "C6"}
STATUS_KEPUTUSAN_GURU = {"diterima", "ditandai", "ditolak"}


class ButirSoalUpdate(BaseModel):
    pertanyaan: str | None = None
    pilihan: dict[str, str] | None = None
    kunci_jawaban: str | None = None
    pembahasan: str | None = None
    level_bloom: str | None = None
    bobot_poin: int | None = None
    status: str | None = None

    @model_validator(mode="after")
    def validasi_isi(self):
        if self.pertanyaan is not None and not self.pertanyaan.strip():
            raise ValueError("Pertanyaan tidak boleh kosong")
        if self.pilihan is not None:
            if set(self.pilihan) != OPSI_JAWABAN or any(
                not v.strip() for v in self.pilihan.values()
            ):
                raise ValueError("Pilihan harus berisi opsi A, B, C, dan D yang terisi")
        if self.kunci_jawaban is not None and self.kunci_jawaban not in OPSI_JAWABAN:
            raise ValueError("Kunci jawaban harus A, B, C, atau D")
        if self.level_bloom is not None and self.level_bloom not in LEVEL_BLOOM:
            raise ValueError("Level Bloom tidak valid")
        if self.bobot_poin is not None and not 1 <= self.bobot_poin <= 100:
            raise ValueError("Bobot poin harus antara 1 dan 100")
        if self.status is not None and self.status not in STATUS_KEPUTUSAN_GURU:
            raise ValueError("Status tidak valid")
        return self


class ButirTertundaResponse(BaseModel):
    id: uuid.UUID
    kisi_kisi_id: uuid.UUID
    kisi_kisi_label: str
    level_bloom: str
    status: str
    ronde_saat_ini: int
    percobaan_ke: int
    alasan_tertunda: str | None
    bisa_dilanjutkan: bool = False
    pertanyaan: str = ""
    updated_at: datetime


class HistoryButirItem(BaseModel):
    id: uuid.UUID
    level_bloom: str
    status: str
    ronde_saat_ini: int
    percobaan_ke: int
    pertanyaan: str
    pilihan: dict[str, str] | None = None
    kunci_jawaban: str | None = None
    pembahasan: str | None = None


class HistoryDebatTerakhir(BaseModel):
    kisi_kisi_id: uuid.UUID
    label: str
    mulai: datetime
    selesai: datetime
    total: int
    hitung: dict[str, int]
    items: list[HistoryButirItem]


class RiwayatPercobaanResponse(BaseModel):
    id: uuid.UUID
    percobaan_ke: int
    hasil: str
    ronde_terakhir: int
    alasan: str | None
    mulai: datetime
    selesai: datetime | None

    model_config = {"from_attributes": True}


class DebatLogResponse(BaseModel):
    id: uuid.UUID
    butir_id: uuid.UUID
    percobaan_ke: int
    ronde: int
    agen: str
    output_json: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class ArsipSimpan(BaseModel):
    butir_id: uuid.UUID
    ronde: int


class ArsipSoalResponse(BaseModel):
    id: uuid.UUID
    kisi_kisi_id: uuid.UUID
    kisi_kisi_label: str
    pertanyaan: str
    pilihan: dict[str, str]
    kunci_jawaban: str
    pembahasan: str
    bobot_poin: int
    sumber_butir_id: uuid.UUID | None = None
    ronde: int | None = None
    asal_status: str | None = None
    jawaban_penjawab_buta: str | None = None
    keyakinan_penjawab_buta: int | None = None
    created_at: datetime
