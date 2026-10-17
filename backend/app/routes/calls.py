from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.schemas import (
    CallCreateRequest,
    CallStageResultCreate,
    CallCloseRequest,
    CallResponse,
    CallStageResultResponse,
    CallListResponse
)
from app.services.call_service import CallService

router = APIRouter(prefix="/v1/calls", tags=["Calls"])

@router.post("", response_model=CallResponse, status_code=status.HTTP_201_CREATED)
def create_call(req: CallCreateRequest, db: Session = Depends(get_db)):
    """
    Start and persist a new call session.
    Prospect metadata is optional.
    """
    call = CallService.create_call(db, req)
    return call

@router.post("/{call_id}/stages", response_model=CallStageResultResponse, status_code=status.HTTP_201_CREATED)
def record_stage_result(
    call_id: str,
    req: CallStageResultCreate,
    db: Session = Depends(get_db)
):
    """
    Persist a stage visit result for an active call.
    Automatically assigns visit_number to preserve history without overwriting previous visits.
    Rejects writes to closed calls and invalid stage numbers.
    """
    stage_result = CallService.add_stage_result(db, call_id, req)
    return stage_result

@router.post("/{call_id}/close", response_model=CallResponse)
def close_call(
    call_id: str,
    req: CallCloseRequest,
    db: Session = Depends(get_db)
):
    """
    Close an active call from any stage, recording the final outcome and agreed next step.
    Asynchronously generates a concise AI summary via Gemini with graceful fallback.
    """
    closed_call = CallService.close_call(db, call_id, req)
    return closed_call

@router.get("", response_model=CallListResponse)
def list_calls(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    List past calls in reverse chronological order with metadata,
    last stage reached, outcome, and summary.
    """
    calls = CallService.list_calls(db, limit=limit, offset=offset)
    total = CallService.count_calls(db)
    return {"items": calls, "total": total}

@router.get("/{call_id}", response_model=CallResponse)
def get_call_detail(
    call_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieve full details for a call, including its complete append-only stage history.
    """
    call = CallService.get_call(db, call_id)
    return call
