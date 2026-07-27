"""WSGI entrypoint for hosts that don't run ASGI directly (PythonAnywhere's
free tier is Apache + uWSGI). Everywhere else — local dev, Docker, Fly.io —
runs `app.main:app` straight over ASGI via uvicorn; this file exists only for
that one deployment target and changes nothing about the app itself.

PythonAnywhere's "Web" tab -> WSGI configuration file should import
`application` from this module.

Deliberately not `a2wsgi`: that library bridges ASGI-to-WSGI via a background
thread running its own event loop, coordinating with the request thread
through cross-thread signaling. That hung indefinitely under PythonAnywhere's
free-tier uWSGI worker (confirmed via a HARAKIRI timeout in production) —
most likely because uWSGI's default worker there doesn't fully support the
background thread ever getting scheduled. This adapter instead runs each
request's ASGI coroutine synchronously via `asyncio.run()`, in the same
thread that received the request — no background thread, no cross-thread
coordination, nothing that depends on threading support existing at all.
The one thing this simpler shape can't do is stream a response as it's
generated (it collects the full body before calling `start_response`), which
this JSON REST API never needs.
"""

from http import HTTPStatus
import asyncio

from app.main import app as asgi_app


def _build_scope(environ: dict) -> dict:
    headers = []
    for key, value in environ.items():
        if key.startswith("HTTP_"):
            name = key[5:].replace("_", "-").lower()
            headers.append((name.encode("latin-1"), value.encode("latin-1")))
        elif key in ("CONTENT_TYPE", "CONTENT_LENGTH"):
            headers.append((key.replace("_", "-").lower().encode("latin-1"), value.encode("latin-1")))

    path = environ.get("PATH_INFO", "")
    return {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.4"},
        "http_version": environ.get("SERVER_PROTOCOL", "HTTP/1.1").rsplit("/", 1)[-1],
        "method": environ["REQUEST_METHOD"],
        "scheme": environ.get("wsgi.url_scheme", "http"),
        "path": path,
        "raw_path": path.encode("utf-8"),
        "query_string": environ.get("QUERY_STRING", "").encode("latin-1"),
        "root_path": environ.get("SCRIPT_NAME", ""),
        "headers": headers,
        "server": (environ.get("SERVER_NAME", ""), int(environ.get("SERVER_PORT") or 0)),
        "client": (environ.get("REMOTE_ADDR", "0.0.0.0"), int(environ.get("REMOTE_PORT") or 0)),
        "extensions": {},
    }


async def _run_asgi(environ: dict) -> tuple[dict, list[bytes]]:
    content_length = int(environ.get("CONTENT_LENGTH") or 0)
    request_body = environ["wsgi.input"].read(content_length) if content_length else b""

    response: dict = {"status": 500, "headers": []}
    body_chunks: list[bytes] = []
    body_sent = False

    async def receive():
        nonlocal body_sent
        if not body_sent:
            body_sent = True
            return {"type": "http.request", "body": request_body, "more_body": False}
        return {"type": "http.disconnect"}

    async def send(message: dict) -> None:
        if message["type"] == "http.response.start":
            response["status"] = message["status"]
            response["headers"] = message.get("headers", [])
        elif message["type"] == "http.response.body":
            body_chunks.append(message.get("body", b""))

    await asgi_app(_build_scope(environ), receive, send)
    return response, body_chunks


def application(environ: dict, start_response) -> list[bytes]:
    response, body_chunks = asyncio.run(_run_asgi(environ))
    status_line = f"{response['status']} {HTTPStatus(response['status']).phrase}"
    headers = [(name.decode("latin-1"), value.decode("latin-1")) for name, value in response["headers"]]
    start_response(status_line, headers)
    return body_chunks
