"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, close_db
from app.clients import init_clients, close_clients
from app.routers import questions, recordings, analysis


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    await init_db()
    await init_clients()
    yield
    # Shutdown: clean up resources
    await close_clients()
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    description="TOEFL Speaking Practice Backend API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

prefix = "/api/v1"
# Include routers
app.include_router(questions.router, prefix=prefix, tags=["Questions"])
app.include_router(recordings.router, prefix=prefix, tags=["Recordings"])
app.include_router(analysis.router, prefix=prefix, tags=["Analysis"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "TOEFL Speaking Backend API", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
