"""WSGI entrypoint for hosts that don't run ASGI directly (PythonAnywhere's
free tier is Apache + mod_wsgi). Everywhere else — local dev, Docker,
Fly.io — runs `app.main:app` straight over ASGI via uvicorn; this file exists
only for that one deployment target and changes nothing about the app itself.

PythonAnywhere's "Web" tab -> WSGI configuration file should import
`application` from this module.
"""

from a2wsgi import ASGIMiddleware

from app.main import app

application = ASGIMiddleware(app)
