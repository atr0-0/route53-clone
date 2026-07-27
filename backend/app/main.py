from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.errors import register_exception_handlers
from app.routers import auth, health

app = FastAPI(title="Route53 Clone API", version="0.1.0")

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

register_exception_handlers(app)

# Unprefixed: direct infra checks. Everything else mounts at /v1 — the browser calls
# /api/v1/*, the Next.js rewrite strips /api, so the backend itself serves /v1/*
# (06-api-contract.md §1 "Conventions").
app.include_router(health.router)
app.include_router(auth.router, prefix="/v1")
