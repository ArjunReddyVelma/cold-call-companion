from unittest.mock import MagicMock
import httpx
from app.services.llm_service import LLMService
from app.models.entities import Call, CallStageResult

def create_sample_call_and_stage():
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
    return call, [stage_result]

def test_llm_service_unconfigured_fallback():
    service = LLMService(api_key=None)
    assert service.is_available() is False
    
    call, stage_results = create_sample_call_and_stage()
    summary = service.generate_summary(call, stage_results)
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

def test_llm_service_successful_summary_generation(monkeypatch):
    """
    Verifies successful summary generation when Gemini API returns 200 OK.
    Verifies that the configured model gemini-3.8-flash is targeted
    and timeout is passed to both client and request.
    """
    service = LLMService(api_key="mock-api-key-12345", model="gemini-3.8-flash", timeout_seconds=30.0)
    assert service.is_available() is True
    assert service.model == "gemini-3.8-flash"
    assert service.timeout_seconds == 30.0

    captured_url = None
    captured_headers = None
    captured_params = None
    captured_client_timeout = None
    captured_request_timeout = None

    def mock_post(self, url, headers=None, params=None, json=None, timeout=None, **kwargs):
        nonlocal captured_url, captured_headers, captured_params, captured_client_timeout, captured_request_timeout
        captured_url = url
        captured_headers = headers
        captured_params = params
        captured_client_timeout = self.timeout
        captured_request_timeout = timeout

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"text": "Prospect agreed to review growth audit report sent over direct WhatsApp on Thursday."}
                        ]
                    }
                }
            ]
        }
        return mock_resp

    monkeypatch.setattr(httpx.Client, "post", mock_post)

    call, stage_results = create_sample_call_and_stage()
    summary = service.generate_summary(call, stage_results)

    assert summary == "Prospect agreed to review growth audit report sent over direct WhatsApp on Thursday."
    # Verify request targeted the configured model
    assert "models/gemini-3.8-flash:generateContent" in captured_url
    assert captured_headers.get("x-goog-api-key") == "mock-api-key-12345"
    assert captured_params.get("key") == "mock-api-key-12345"
    # Verify timeout was applied to client and request
    assert captured_client_timeout.read == 30.0
    assert captured_request_timeout == 30.0

def test_llm_service_provider_404_model_not_found(monkeypatch):
    """
    Verifies graceful fallback when provider returns 404 (e.g. invalid or deprecated model name).
    """
    service = LLMService(api_key="mock-api-key-12345", model="gemini-3.8-flash")

    def mock_post_404(self, url, headers=None, params=None, json=None, **kwargs):
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_resp.text = '{"error": {"code": 404, "message": "models/gemini-1.5-flash is not found"}}'
        return mock_resp

    monkeypatch.setattr(httpx.Client, "post", mock_post_404)

    call, stage_results = create_sample_call_and_stage()
    summary = service.generate_summary(call, stage_results)
    assert summary == "Summary unavailable (provider error 404)"

def test_llm_service_timeout_fallback(monkeypatch, caplog):
    """
    Verifies graceful fallback when provider call exceeds configured timeout.
    Verifies that timeout duration is properly formatted in the warning log.
    """
    service = LLMService(api_key="mock-api-key-12345", model="gemini-3.8-flash", timeout_seconds=30.0)

    def mock_timeout(self, url, headers=None, params=None, json=None, **kwargs):
        raise httpx.TimeoutException("The read operation timed out")

    monkeypatch.setattr(httpx.Client, "post", mock_timeout)

    call, stage_results = create_sample_call_and_stage()
    with caplog.at_level("WARNING"):
        summary = service.generate_summary(call, stage_results)

    assert summary == "Summary unavailable (AI request timed out)"
    assert "Gemini API call for model gemini-3.8-flash timed out after 30 seconds." in caplog.text

def test_llm_service_empty_candidates_fallback(monkeypatch):
    """
    Verifies fallback when provider returns 200 OK but empty candidates.
    """
    service = LLMService(api_key="mock-api-key-12345", model="gemini-3.8-flash")

    def mock_empty_post(self, url, headers=None, params=None, json=None, **kwargs):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"candidates": []}
        return mock_resp

    monkeypatch.setattr(httpx.Client, "post", mock_empty_post)

    call, stage_results = create_sample_call_and_stage()
    summary = service.generate_summary(call, stage_results)
    assert summary == "Summary unavailable (empty response from AI provider)"

def test_llm_service_credential_sanitization():
    """
    Verifies that _sanitize removes the API key from logged error strings.
    """
    secret_key = "AIzaSySecretTestKey999"
    service = LLMService(api_key=secret_key, model="gemini-3.8-flash")
    
    error_with_key = f"Error connecting to https://generativelanguage.googleapis.com?key={secret_key}"
    sanitized = service._sanitize(error_with_key)
    
    assert secret_key not in sanitized
    assert "[REDACTED]" in sanitized

def test_llm_service_model_override():
    """
    Verifies that model can be configured per instance or via config.
    """
    service_custom = LLMService(api_key="test-key", model="gemini-custom-pro")
    assert service_custom.model == "gemini-custom-pro"

    service_default = LLMService(api_key="test-key")
    assert service_default.model == "gemini-3.8-flash"

def test_llm_service_timeout_configuration():
    """
    Verifies that timeout can be configured via GEMINI_TIMEOUT_SECONDS or per instance.
    """
    # Default should be 30.0 seconds
    service_default = LLMService()
    assert service_default.timeout_seconds == 30.0

    # Custom timeout via init parameter
    service_custom = LLMService(timeout_seconds=45.0)
    assert service_custom.timeout_seconds == 45.0

    # Custom int converted to float
    service_int = LLMService(timeout_seconds=15)
    assert service_int.timeout_seconds == 15.0

def test_close_call_succeeds_when_gemini_times_out(client, monkeypatch):
    """
    Verifies that an AI timeout never prevents a call from closing or its outcome from being saved.
    """
    from app.services.llm_service import llm_service

    call_res = client.post("/v1/calls", json={"prospect_name": "Timeout Resilience Test", "company_name": "Test Co"})
    assert call_res.status_code == 201
    call_id = call_res.json()["id"]

    monkeypatch.setattr(llm_service, "api_key", "test-key-for-timeout")
    original_post = httpx.Client.post

    def mock_timeout_during_close(self, url, headers=None, params=None, json=None, **kwargs):
        if "generativelanguage.googleapis.com" in str(url):
            raise httpx.TimeoutException("Read timed out")
        return original_post(self, url, headers=headers, params=params, json=json, **kwargs)

    monkeypatch.setattr(httpx.Client, "post", mock_timeout_during_close)

    close_res = client.post(
        f"/v1/calls/{call_id}/close",
        json={
            "final_outcome": "agreed_to_receive_report",
            "next_step": "Send report to email",
            "last_stage_reached": 6
        }
    )
    assert close_res.status_code == 200
    data = close_res.json()
    assert data["id"] == call_id
    assert data["is_closed"] is True
    assert data["final_outcome"] == "agreed_to_receive_report"
    assert data["next_step"] == "Send report to email"
    assert data["summary"] == "Summary unavailable (AI request timed out)"

