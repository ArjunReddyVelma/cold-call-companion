from typing import List
from fastapi import APIRouter
from app.models.schemas import StageDefinitionResponse
from app.models.stages_data import OFFICIAL_STAGES

router = APIRouter(prefix="/v1/stages", tags=["Stages"])

@router.get("", response_model=List[StageDefinitionResponse])
def get_stage_definitions():
    """
    Returns the versioned definitions for all 8 cold-call stages,
    including purpose, transcript-derived examples, and quick-tap outcomes.
    """
    return OFFICIAL_STAGES
