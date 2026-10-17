from app.services.llm_service import LLMService
from app.models.entities import Call, CallStageResult

def test_llm_service_unconfigured_fallback():
    service = LLMService(api_key=None)
    assert service.is_available() is False
    
    call = Call(
        id="test-123",
        prospect_name="Rajesh Sharma",
        company_name="Sharma Engineering",
        final_outcome="agreed_to_receive_report",
        next_step="Send report on WhatsApp",
        last_stage_reached=7
    )
    stage_result = CallStageResult(
        call_id="test-123",
        stage_number=7,
        visit_number=1,
        selected_result="Agreed to report via WhatsApp",
        prospect_words="Send to my WhatsApp"
    )
    
    summary = service.generate_summary(call, [stage_result])
    assert "Summary unavailable" in summary
    assert "Gemini API key not configured" in summary

def test_close_call_succeeds_even_when_llm_fails(client):
    call_res = client.post("/v1/calls", json={"prospect_name": "Test LLM Resilience"})
    call_id = call_res.json()["id"]

    # Close the call - LLM will encounter unconfigured key or offline state
    close_res = client.post(
        f"/v1/calls/{call_id}/close",
        json={
            "final_outcome": "next_step_agreed",
            "next_step": "Meeting on Friday 11 AM",
            "last_stage_reached": 7
        }
    )
    # Must succeed with 200 OK!
    assert close_res.status_code == 200
    data = close_res.json()
    assert data["is_closed"] is True
    assert data["final_outcome"] == "next_step_agreed"
    # Summary should be gracefully populated with unavailable notice, not null/crash
    assert data["summary"] is not None
    assert "Summary unavailable" in data["summary"]
