from datetime import datetime
from enum import Enum
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_serializer

class CallOutcome(str, Enum):
    AGREED_TO_RECEIVE_REPORT = "agreed_to_receive_report"
    NEXT_STEP_AGREED = "next_step_agreed"
    INTERESTED = "interested"
    FOLLOW_UP = "follow_up"
    CALL_AGAIN = "call_again"
    NOT_INTERESTED = "not_interested"
    DO_NOT_CALL = "do_not_call"
    WRONG_PERSON = "wrong_person"
    MOVED_COMPANY = "moved_company"
    NOT_LOGGED = "not_logged"

# --- Request Models ---

class CallCreateRequest(BaseModel):
    prospect_name: Optional[str] = Field(None, max_length=255, description="Prospect full name")
    company_name: Optional[str] = Field(None, max_length=255, description="Target company name")
    prospect_role: Optional[str] = Field(None, max_length=255, description="Prospect designation/role")

class CallStageResultCreate(BaseModel):
    stage_number: int = Field(..., ge=1, le=8, description="Stage number from 1 to 8")
    selected_result: str = Field(..., min_length=1, max_length=255, description="Quick-tap outcome label")
    prospect_words: Optional[str] = Field(None, description="Exact prospect phrasing recorded by caller")

class CallCloseRequest(BaseModel):
    final_outcome: CallOutcome = Field(..., description="One of the 10 official call outcomes")
    next_step: Optional[str] = Field(None, description="Agreed next step deliverable or action")
    next_step_at: Optional[datetime] = Field(None, description="Agreed date/time for callback or meeting")
    last_stage_reached: Optional[int] = Field(None, ge=1, le=8, description="Last stage reached during the call")

# --- Response Models ---

class CallStageResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    call_id: UUID
    stage_number: int
    visit_number: int
    selected_result: str
    prospect_words: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @field_serializer("id", "call_id")
    def serialize_uuid(self, v: UUID) -> str:
        return str(v)

class CallResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    prospect_name: Optional[str] = None
    company_name: Optional[str] = None
    prospect_role: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    last_stage_reached: int
    final_outcome: Optional[str] = None
    next_step: Optional[str] = None
    next_step_at: Optional[datetime] = None
    summary: Optional[str] = None
    is_closed: bool
    created_at: datetime
    updated_at: datetime
    stage_results: Optional[List[CallStageResultResponse]] = None

    @field_serializer("id")
    def serialize_uuid(self, v: UUID) -> str:
        return str(v)

class CallListResponse(BaseModel):
    items: List[CallResponse]
    total: int

class StageDefinitionResponse(BaseModel):
    stage_number: int
    name: str
    purpose: str
    likely_responses: List[str]
    quick_tap_options: List[str]
