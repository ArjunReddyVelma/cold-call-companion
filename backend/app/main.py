from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.config import settings
from app.database import init_db
from app.routes import health, calls, stages

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema on startup
    init_db()
    logger.info("Cold Call Companion backend started successfully.")
    yield
    logger.info("Cold Call Companion backend shutting down.")

app = FastAPI(
    title="Cold Call Companion API",
    description="Backend API for guiding and recording B2B cold calls across 8 stages",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
if settings.FRONTEND_ORIGIN == "*":
    origins = ["*"]
else:
    origins = [orig.strip() for orig in settings.FRONTEND_ORIGIN.split(",") if orig.strip()]
    for local_origin in ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]:
        if local_origin not in origins:
            origins.append(local_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$" if settings.FRONTEND_ORIGIN != "*" else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health.router)
app.include_router(calls.router)
app.include_router(stages.router)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception at {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again."}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
