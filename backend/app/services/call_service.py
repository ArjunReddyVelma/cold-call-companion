import logging
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from app.models.entities import Call, CallStageResult
from app.models.schemas import CallCreateRequest, CallStageResultCreate, CallCloseRequest
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)

class CallService:
    @staticmethod
    def create_call(db: Session, req: CallCreateRequest) -> Call:
        call = Call(
            prospect_name=req.prospect_name.strip() if req.prospect_name else None,
            company_name=req.company_name.strip() if req.company_name else None,
            prospect_role=req.prospect_role.strip() if req.prospect_role else None,
            last_stage_reached=1,
            is_closed=False
        )
        db.add(call)
        db.commit()
        db.refresh(call)
        logger.info(f"Created new call {call.id} for prospect: {call.prospect_name or 'Unknown'}")
        return call

    @staticmethod
    def add_stage_result(db: Session, call_id: str, req: CallStageResultCreate) -> CallStageResult:
        call = db.query(Call).filter(Call.id == call_id).first()
        if not call:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Call with ID '{call_id}' not found."
            )
        
        if call.is_closed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot add stage results to a closed call."
            )

        if not (1 <= req.stage_number <= 8):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stage number must be between 1 and 8."
            )

        # Compute visit_number safely on backend to guarantee immutable history
        max_visit = (
            db.query(func.max(CallStageResult.visit_number))
            .filter(
                CallStageResult.call_id == call_id,
                CallStageResult.stage_number == req.stage_number
            )
            .scalar()
        )
        next_visit = (max_visit or 0) + 1

        stage_result = CallStageResult(
            call_id=call_id,
            stage_number=req.stage_number,
            visit_number=next_visit,
            selected_result=req.selected_result.strip(),
            prospect_words=req.prospect_words.strip() if req.prospect_words else None
        )
        db.add(stage_result)

        # Update last_stage_reached if caller progressed to a higher stage
        if req.stage_number > call.last_stage_reached:
            call.last_stage_reached = req.stage_number

        db.commit()
        db.refresh(stage_result)
        logger.info(
            f"Logged stage result for call {call_id}: Stage {req.stage_number}, Visit {next_visit}"
        )
        return stage_result

    @staticmethod
    def close_call(db: Session, call_id: str, req: CallCloseRequest) -> Call:
        call = db.query(Call).filter(Call.id == call_id).first()
        if not call:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Call with ID '{call_id}' not found."
            )

        call.is_closed = True
        call.ended_at = datetime.utcnow()
        call.final_outcome = req.final_outcome.value
        call.next_step = req.next_step.strip() if req.next_step else None
        call.next_step_at = req.next_step_at
        
        if req.last_stage_reached:
            call.last_stage_reached = req.last_stage_reached

        # Fetch all stage results to feed the LLM summarizer
        stage_results = (
            db.query(CallStageResult)
            .filter(CallStageResult.call_id == call_id)
            .order_by(CallStageResult.created_at.asc())
            .all()
        )

        # Generate factual AI summary (graceful fallback if LLM offline)
        try:
            summary = llm_service.generate_summary(call, stage_results)
            call.summary = summary
        except Exception as e:
            logger.error(f"Error during call summary generation: {str(e)}")
            call.summary = "Summary unavailable (generation error)"

        db.commit()
        db.refresh(call)
        logger.info(f"Closed call {call_id} with outcome '{call.final_outcome}'")
        return call

    @staticmethod
    def get_call(db: Session, call_id: str) -> Call:
        call = db.query(Call).filter(Call.id == call_id).first()
        if not call:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Call with ID '{call_id}' not found."
            )
        return call

    @staticmethod
    def list_calls(db: Session, limit: int = 50, offset: int = 0) -> List[Call]:
        return (
            db.query(Call)
            .order_by(Call.started_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    @staticmethod
    def count_calls(db: Session) -> int:
        return db.query(func.count(Call.id)).scalar() or 0
