from datetime import datetime
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check(response: Response, db: Session = Depends(get_db)):
    """
    Public health check endpoint.
    Verifies service vitality and database connectivity.
    Returns HTTP 200 when healthy, or HTTP 503 if database check fails.
    """
    db_status = "connected"
    is_healthy = True
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        is_healthy = False
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ok" if is_healthy else "unhealthy",
        "service": "cold-call-companion-backend",
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
