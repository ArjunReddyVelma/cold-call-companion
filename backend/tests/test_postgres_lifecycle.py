"""
Verification of Production PostgreSQL Engine:
Tests the complete lifecycle, unique constraints, check constraints,
triggers, and data persistence against live PostgreSQL (coldcall_prod).
"""

import os
import uuid
import socket
import pytest
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError

from app.models.entities import Call, CallStageResult
from app.services.call_service import CallService

PG_URL = os.getenv("PG_TEST_URL", "postgresql://reddy@localhost:5432/coldcall_prod")

def is_pg_available():
    try:
        s = socket.create_connection(("localhost", 5432), timeout=0.5)
        s.close()
        return True
    except Exception:
        return False

@pytest.mark.skipif(not is_pg_available(), reason="PostgreSQL TCP port 5432 not reachable in current execution environment")
def test_postgresql_full_lifecycle():
    engine = create_engine(PG_URL, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # 1. Connectivity and schema check
        res = session.execute(text("SELECT current_database(), version();")).fetchone()
        assert res is not None
        assert res[0] == "coldcall_prod"

        # 2. Start T082 Call
        call = Call(
            prospect_name="Anand Verma",
            company_name="Modern Lighting Solutions",
            prospect_role="Founder / Managing Director",
            last_stage_reached=1,
            is_closed=False
        )
        session.add(call)
        session.commit()
        session.refresh(call)
        call_id = call.id
        assert call_id is not None
        created_at_initial = call.created_at

        # 3. Stage 1 Visit 1
        sr1 = CallStageResult(
            call_id=call_id,
            stage_number=1,
            visit_number=1,
            selected_result="Reached intended person",
            prospect_words="Yes, Anand speaking. What is this regarding?"
        )
        session.add(sr1)
        session.commit()

        # 4. Stage 2 Visit 1
        sr2_v1 = CallStageResult(
            call_id=call_id,
            stage_number=2,
            visit_number=1,
            selected_result="Understood / allowed to continue",
            prospect_words="Understood. What kind of manufacturing assessments do you run?"
        )
        session.add(sr2_v1)
        session.commit()

        # 5. Stage 4 Visit 1
        sr4 = CallStageResult(
            call_id=call_id,
            stage_number=4,
            visit_number=1,
            selected_result="Shared business context",
            prospect_words="We manufacture die-cast aluminum outdoor lighting housings in Vasai."
        )
        session.add(sr4)
        session.commit()

        # 6. Stage 2 Visit 2 (Non-linear revisit)
        sr2_v2 = CallStageResult(
            call_id=call_id,
            stage_number=2,
            visit_number=2,
            selected_result="Asked what we do",
            prospect_words="Can you clarify whether your diagnostic report covers plant floor defect reduction or only sales?"
        )
        session.add(sr2_v2)
        session.commit()

        # 7. Stage 7 Visit 1
        sr7 = CallStageResult(
            call_id=call_id,
            stage_number=7,
            visit_number=1,
            selected_result="Agreed to report via WhatsApp",
            prospect_words="Send sample comparison report to my direct WhatsApp, I will review on weekend."
        )
        session.add(sr7)
        session.commit()

        # 8. Close Call
        call.is_closed = True
        call.ended_at = datetime.utcnow()
        call.last_stage_reached = 7
        call.final_outcome = "agreed_to_receive_report"
        call.next_step = "Send sample comparison report via WhatsApp"
        call.summary = "Summary verified in PostgreSQL"
        session.commit()
        session.refresh(call)

        # 9. Verify Trigger: updated_at >= created_at
        assert call.updated_at >= created_at_initial

        # 10. Verify Data Persistence across a completely new session / engine connection
        session.close()

        # Reconnect with fresh session
        new_session = Session()
        fetched_call = new_session.query(Call).filter(Call.id == call_id).first()
        assert fetched_call is not None
        assert fetched_call.prospect_name == "Anand Verma"
        assert fetched_call.company_name == "Modern Lighting Solutions"
        assert fetched_call.final_outcome == "agreed_to_receive_report"
        assert fetched_call.last_stage_reached == 7

        results = new_session.query(CallStageResult).filter(CallStageResult.call_id == call_id).order_by(CallStageResult.created_at.asc()).all()
        assert len(results) == 5

        s2_visits = [r for r in results if r.stage_number == 2]
        assert len(s2_visits) == 2
        assert s2_visits[0].visit_number == 1
        assert s2_visits[0].prospect_words == "Understood. What kind of manufacturing assessments do you run?"
        assert s2_visits[1].visit_number == 2
        assert s2_visits[1].prospect_words == "Can you clarify whether your diagnostic report covers plant floor defect reduction or only sales?"

        # 11. Test PostgreSQL Unique Constraint (uq_call_stage_visit)
        duplicate_sr = CallStageResult(
            call_id=call_id,
            stage_number=2,
            visit_number=1,  # Duplicate of visit 1!
            selected_result="Duplicate test"
        )
        new_session.add(duplicate_sr)
        with pytest.raises(IntegrityError):
            new_session.commit()
        new_session.rollback()

        # 12. Test PostgreSQL Check Constraint on invalid stage_number
        invalid_stage_sr = CallStageResult(
            call_id=call_id,
            stage_number=9,  # Invalid: check constraint requires between 1 and 8
            visit_number=1,
            selected_result="Invalid stage"
        )
        new_session.add(invalid_stage_sr)
        with pytest.raises(IntegrityError):
            new_session.commit()
        new_session.rollback()

        # 13. Test PostgreSQL Check Constraint on invalid outcome
        invalid_outcome_call = Call(
            prospect_name="Test",
            company_name="Test",
            final_outcome="invalid_outcome_type"  # Not one of 10 outcomes!
        )
        new_session.add(invalid_outcome_call)
        with pytest.raises(IntegrityError):
            new_session.commit()
        new_session.rollback()

        new_session.close()
    finally:
        session.close()
        engine.dispose()

if __name__ == "__main__":
    test_postgresql_full_lifecycle()
    print("ALL POSTGRESQL PRODUCTION CHECKS PASSED!")
