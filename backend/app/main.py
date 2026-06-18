"""PatchOps — FastAPI Application Entry Point"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.core.logging import setup_logging
from app.db.session import init_db
from app.api.routes import (
    auth, webhooks, change_requests, servers,
    knowledge, agents, users, reports
)

setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="PatchOps CR Management",
    version="1.0.0",
    description="Agentic Change Request Management for Windows Infrastructure Patching",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ─── Middleware ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["Webhooks"])
app.include_router(change_requests.router, prefix="/api/crs", tags=["Change Requests"])
app.include_router(agents.router, prefix="/api/agents", tags=["Agents"])
app.include_router(servers.router, prefix="/api/servers", tags=["Servers"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["Knowledge Base"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
