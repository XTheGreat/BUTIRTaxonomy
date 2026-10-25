from fastapi import FastAPI
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.types import ASGIApp, Message, Receive, Scope, Send

RAHASIA_BAWAAN = "dev-secret-change-me"
PANJANG_RAHASIA_MINIMAL = 32


class RahasiaTidakAman(RuntimeError):
    pass


def periksa_rahasia_produksi(jwt_secret: str, mode_produksi: bool) -> None:
    if not mode_produksi:
        return
    if jwt_secret == RAHASIA_BAWAAN or len(jwt_secret) < PANJANG_RAHASIA_MINIMAL:
        raise RahasiaTidakAman(
            f"JWT_SECRET tidak aman untuk produksi: isi dengan string acak minimal {PANJANG_RAHASIA_MINIMAL} karakter, "
            'mis. python -c "import secrets; print(secrets.token_urlsafe(48))"'
        )


class HeaderKeamanan:
    def __init__(self, app: ASGIApp, hsts: bool = False):
        self.app = app
        self.hsts = hsts

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def kirim(pesan: Message) -> None:
            if pesan["type"] == "http.response.start":
                headers = list(pesan.get("headers", []))
                ada = {k.lower() for k, _ in headers}

                def pasang(nama: bytes, nilai: bytes) -> None:
                    if nama not in ada:
                        headers.append((nama, nilai))

                pasang(b"x-content-type-options", b"nosniff")
                pasang(b"x-frame-options", b"DENY")
                pasang(b"referrer-policy", b"no-referrer")
                pasang(b"cache-control", b"no-store")
                if self.hsts:
                    pasang(b"strict-transport-security", b"max-age=31536000; includeSubDomains")
                pesan["headers"] = headers
            await send(pesan)

        await self.app(scope, receive, kirim)


def pasang_keamanan(app: FastAPI, paksa_https: bool) -> None:
    app.add_middleware(HeaderKeamanan, hsts=paksa_https)
    if paksa_https:
        app.add_middleware(HTTPSRedirectMiddleware)
