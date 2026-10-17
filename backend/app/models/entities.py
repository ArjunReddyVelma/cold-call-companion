import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    SmallInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint,
    Index
)
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Call(Base):
    __tablename__ = "calls"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    prospect_name = Column(String(255), nullable=True)
    company_name = Column(String(255), nullable=True)
    prospect_role = Column(String(255), nullable=True)
    
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    last_stage_reached = Column(SmallInteger, default=1, nullable=False)
    
    # One of the 10 official call outcomes
    final_outcome = Column(String(50), nullable=True)
    next_step = Column(Text, nullable=True)
    next_step_at = Column(DateTime, nullable=True)
    summary = Column(Text, nullable=True)
    
    is_closed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship to immutable stage visits
    stage_results = relationship(
        "CallStageResult",
        back_populates="call",
        cascade="all, delete-orphan",
        order_by="CallStageResult.created_at.asc()"
    )

    __table_args__ = (
        Index("idx_calls_started_at", "started_at"),
        Index("idx_calls_is_closed", "is_closed"),
    )


class CallStageResult(Base):
    __tablename__ = "call_stage_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    call_id = Column(String(36), ForeignKey("calls.id", ondelete="CASCADE"), nullable=False)
    stage_number = Column(SmallInteger, nullable=False)
    visit_number = Column(Integer, default=1, nullable=False)
    selected_result = Column(String(255), nullable=False)
    prospect_words = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    call = relationship("Call", back_populates="stage_results")

    __table_args__ = (
        UniqueConstraint("call_id", "stage_number", "visit_number", name="uq_call_stage_visit"),
        Index("idx_call_stage_results_stage", "call_id", "stage_number", "visit_number"),
    )
