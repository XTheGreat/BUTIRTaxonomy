import asyncio

import httpx
from fastapi import FastAPI
from fastapi.responses import PlainTextResponse

from app.core.keamanan import (
    PANJANG_RAHASIA_MINIMAL,
    RAHASIA_BAWAAN,
    RahasiaTidakAman,
    pasang_keamanan,
)


def buat_app(paksa_https: bool) -> FastAPI:
    app = FastAPI()

    @app.get("/data")
    async def data():
        return {"ok": True}

    @app.get("/berkas")
    async def berkas():
        return PlainTextResponse("x", headers={"Cache-Control": "public, max-age=60"})

    pasang_keamanan(app, paksa_https)
    return app


async def ambil(app: FastAPI, url: str, **kw) -> httpx.Response:
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), follow_redirects=False) as c:
        return await c.get(url, **kw)


async def _jalankan():
    dev = buat_app(False)
    r = await ambil(dev, "http://uji/data")
    assert r.status_code == 200 and r.json() == {"ok": True}
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert r.headers["referrer-policy"] == "no-referrer"
    assert r.headers["cache-control"] == "no-store", "data pribadi tidak boleh di-cache"
    assert "strict-transport-security" not in r.headers, "HSTS lewat http biasa tidak boleh dikirim"
    assert (await ambil(dev, "https://uji/data")).status_code == 200

    r = await ambil(dev, "http://uji/berkas")
    assert r.headers["cache-control"] == "public, max-age=60"
    assert r.headers["x-content-type-options"] == "nosniff"

    prod = buat_app(True)
    r = await ambil(prod, "http://uji/data?x=1")
    assert r.status_code == 307, "http harus dialihkan"
    assert r.headers["location"] == "https://uji/data?x=1", r.headers["location"]

    r = await ambil(prod, "https://uji/data")
    assert r.status_code == 200 and r.json() == {"ok": True}
    assert "max-age=31536000" in r.headers["strict-transport-security"]
    assert "includesubdomains" in r.headers["strict-transport-security"].lower()
    assert r.headers["x-frame-options"] == "DENY" and r.headers["cache-control"] == "no-store"

    r = await ambil(prod, "https://uji/tidak-ada")
    assert r.status_code == 404 and r.headers["x-content-type-options"] == "nosniff"

    import app.main as main
    r = await ambil(main.app, "http://uji/")
    assert r.status_code == 200 and r.headers["x-content-type-options"] == "nosniff"


def uji_penjaga_rahasia():
    from app.core.keamanan import periksa_rahasia_produksi as periksa

    kuat = "x" * PANJANG_RAHASIA_MINIMAL
    periksa(RAHASIA_BAWAAN, mode_produksi=False)
    periksa("pendek", mode_produksi=False)
    for buruk in (RAHASIA_BAWAAN, "pendek", "x" * (PANJANG_RAHASIA_MINIMAL - 1), ""):
        try:
            periksa(buruk, mode_produksi=True)
            raise AssertionError(f"{buruk!r} seharusnya ditolak di produksi")
        except RahasiaTidakAman as e:
            assert "JWT_SECRET" in str(e) and "secrets" in str(e), "pesan harus memberi cara memperbaikinya"
    periksa(kuat, mode_produksi=True)


def uji_start_menolak_rahasia_bawaan():
    import app.main as main

    s = main.settings
    asli = (s.PAKSA_HTTPS, s.JWT_SECRET)
    s.PAKSA_HTTPS, s.JWT_SECRET = True, RAHASIA_BAWAAN
    try:
        async def start():
            async with main.app.router.lifespan_context(main.app):
                pass

        try:
            asyncio.run(start())
            raise AssertionError("start seharusnya ditolak")
        except RahasiaTidakAman:
            pass
    finally:
        s.PAKSA_HTTPS, s.JWT_SECRET = asli


def test_https():
    asyncio.run(_jalankan())
    uji_penjaga_rahasia()
    uji_start_menolak_rahasia_bawaan()


if __name__ == "__main__":
    asyncio.run(_jalankan())
    uji_penjaga_rahasia()
    uji_start_menolak_rahasia_bawaan()
    print("Semua tes HTTPS lulus.")
