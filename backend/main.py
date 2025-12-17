#!/usr/bin/env python3
"""Run the FastAPI application."""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app"],  # Only watch app/ directory
        reload_excludes=["**/__pycache__/**", "**/*.pyc"]
    )
