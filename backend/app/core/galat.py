from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic_core import PydanticCustomError


class Galat(HTTPException):
    """HTTPException dengan kode stabil agar frontend bisa menerjemahkannya.

    `pesan` tetap kalimat Indonesia dan tetap dikirim sebagai `detail`, jadi klien
    yang belum mengenal `kode` bekerja seperti biasa. `param` berisi nilai yang
    dipakai kalimat itu (mis. jumlah kursi) agar terjemahan bisa menyusun ulang.
    """

    def __init__(self, status_code: int, kode: str, pesan: str, **param):
        super().__init__(status_code=status_code, detail=pesan)
        self.kode = kode
        self.param = param


async def tangani_galat(request: Request, exc: Galat) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "kode": exc.kode, "param": exc.param},
        headers=exc.headers,
    )


def galat_validasi(kode: str, pesan: str, **param) -> PydanticCustomError:
    """Padanan `Galat` untuk validator Pydantic.

    Dipakai dengan `raise galat_validasi(...)` di dalam validator. Respons 422 FastAPI
    memuat `type` = kode dan `ctx` = param, sehingga frontend bisa menerjemahkannya.
    `pesan` boleh memakai `{nama}` untuk param.
    """
    return PydanticCustomError(kode, pesan, param or None)
