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
    Verifies header-only authentication (no key in params), model targeting,
    and timeout application to client and request.
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
                            {"text": "- Conversation Recap: Reached prospect.\n- Agreed Outcome: Agreed to report."}
                        ]
                    }
                }
            ]
        }
        return mock_resp

    monkeypatch.setattr(httpx.Client, "post", mock_post)

    call, stage_results = create_sample_call_and_stage()
    summary = service.generate_summary(call, stage_results)

    assert "- Conversation Recap: Reached prospect." in summary
    assert "models/gemini-3.8-flash:generateContent" in captured_url
    assert captured_headers.get("x-goog-api-key") == "mock-api-key-12345"
    assert captured_params is None  # Header auth only, no key in query params
    assert captured_client_timeout.read == 30.0
    assert captured_request_timeout == 30.0

def test_llm_service_realistic_call_multi_section_prompt_and_summary(monkeypatch):
    """
    Verifies that a realistic multi-stage call creates a prompt with stage history,
    verbatim notes, next steps, and instructions for all 5 required summary sections.
    Also verifies that thought/reasoning parts are filtered out while the full summary text is extracted.
    """
    service = LLMService(api_key="mock-api-key-12345", model="gemini-3.8-flash")

    call = Call(
        id="t082-test",
        prospect_name="Anand Verma",
        company_name="Modern Lighting Solutions",
        prospect_role="Founder / Managing Director",
        final_outcome="agreed_to_receive_report",
        next_step="Send sample comparison report to WhatsApp",
        last_stage_reached=7
    )
    stage_results = [
        CallStageResult(
            call_id="t082-test",
            stage_number=1,
            visit_number=1,
            selected_result="Reached intended person",
            prospect_words="Yes, Anand speaking. What is this regarding?"
        ),
        CallStageResult(
            call_id="t082-test",
            stage_number=2,
            visit_number=1,
            selected_result="Understood / allowed to continue",
            prospect_words="Understood. What kind of manufacturing assessments do you run?"
        ),
        CallStageResult(
            call_id="t082-test",
            stage_number=4,
            visit_number=1,
            selected_result="Shared business context",
            prospect_words="We manufacture die-cast aluminum outdoor lighting housings in Vasai."
        ),
        CallStageResult(
            call_id="t082-test",
            stage_number=7,
            visit_number=1,
            selected_result="Agreed to report via WhatsApp",
            prospect_words="Send sample comparison report to my direct WhatsApp, I will review on weekend."
        )
    ]

    captured_prompt = None

    def mock_post(self, url, headers=None, params=None, json=None, timeout=None, **kwargs):
        nonlocal captured_prompt
        captured_prompt = json["contents"][0]["parts"][0]["text"]
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"thought": True, "text": "The prospect is Anand Verma, founder of Modern Lighting Solutions..."},
                            {
                                "text": (
                                    "- Conversation Recap: Contacted Anand Verma and navigated through opening and purpose stages.\n"
                                    "- Prospect Needs & Interests: Operations focus on die-cast aluminum lighting housings in Vasai.\n"
                                    "- Objections or Concerns: Clarified whether assessments cover plant defect reduction or sales.\n"
                                    "- Agreed Outcome: Agreed to receive diagnostic growth audit report.\n"
                                    "- Recorded Next Steps: Send sample comparison report to direct WhatsApp for weekend review."
                                )
                            }
                        ]
                    }
                }
            ]
        }
        return mock_resp

    monkeypatch.setattr(httpx.Client, "post", mock_post)

    summary = service.generate_summary(call, stage_results)

    # 1. Verify prompt contains required stage history and prospect words
    assert "Stage 1 (Opening) [Visit 1]" in captured_prompt
    assert "Stage 4 (Their Business) [Visit 1]" in captured_prompt
    assert "Stage 7 (Next Step) [Visit 1]" in captured_prompt
    assert "We manufacture die-cast aluminum outdoor lighting housings in Vasai." in captured_prompt
    assert "Send sample comparison report to WhatsApp" in captured_prompt
    assert "Conversation Recap" in captured_prompt
    assert "Prospect Needs & Interests" in captured_prompt
    assert "Objections or Concerns" in captured_prompt
    assert "Agreed Outcome" in captured_prompt
    assert "Recorded Next Steps" in captured_prompt

    # 2. Verify summary text extracted correctly without thought part
    assert "The prospect is Anand Verma, founder" not in summary
    assert "- Conversation Recap: Contacted Anand Verma" in summary
    assert "- Prospect Needs & Interests: Operations focus on die-cast aluminum" in summary
    assert "- Agreed Outcome: Agreed to receive diagnostic growth audit report." in summary
    assert "- Recorded Next Steps: Send sample comparison report to direct WhatsApp" in summary

def test_llm_service_multipart_text_concatenation(monkeypatch):
    """
    Verifies that multi-part text responses from Gemini are properly joined together
    rather than truncated to only the first part.
    """
    service = LLMService(api_key="mock-api-key-12345", model="gemini-3.8-flash")
    call, stage_results = create_sample_call_and_stage()

    def mock_multipart_post(self, url, headers=None, params=None, json=None, timeout=None, **kwargs):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"text": "- Conversation Recap: Call initiated. "},
                            {"text": "- Prospect Needs & Interests: Automotive components. "},
                            {"text": "- Agreed Outcome: Follow-up agreed."}
                        ]
                    }
                }
            ]
        }
        return mock_resp

    monkeypatch.setattr(httpx.Client, "post", mock_multipart_post)
    summary = service.generate_summary(call, stage_results)

    assert "- Conversation Recap: Call initiated." in summary
    assert "- Prospect Needs & Interests: Automotive components." in summary
    assert "- Agreed Outcome: Follow-up agreed." in summary

def test_close_call_persists_full_ai_summary_and_call_detail_api_returns_it(client, monkeypatch):
    """
    Verifies end-to-end that closing a call with recorded stage visits generates and persists
    the structured multi-section AI summary, and GET /v1/calls/{id} returns that exact summary.
    Also verifies that prospect name, role, final outcome, and notes are not overwritten.
    """
    from app.services.llm_service import llm_service

    # 1. Create a call
    call_res = client.post(
        "/v1/calls",
        json={
            "prospect_name": "Arjun Reddy",
            "prospect_role": "founder",
            "company_name": "DeepThought"
        }
    )
    assert call_res.status_code == 201
    call_id = call_res.json()["id"]

    # 2. Record Stage 1 and Stage 2 visits
    s1_res = client.post(
        f"/v1/calls/{call_id}/stages",
        json={
            "stage_number": 1,
            "selected_result": "Reached intended person",
            "prospect_words": "Yes, Arjun here."
        }
    )
    assert s1_res.status_code == 201

    s2_res = client.post(
        f"/v1/calls/{call_id}/stages",
        json={
            "stage_number": 2,
            "selected_result": "Allowed opening hook",
            "prospect_words": "Tell me more about your evaluation framework."
        }
    )
    assert s2_res.status_code == 201

    # 3. Mock Gemini to return realistic multi-section summary
    monkeypatch.setattr(llm_service, "api_key", "test-key-valid")

    structured_summary = (
        "- Conversation Recap: Contacted Arjun Reddy (founder) and introduced the framework.\n"
        "- Prospect Needs & Interests: Exploring deep reasoning automation for sales intelligence.\n"
        "- Objections or Concerns: Inquired about specific evaluation metrics.\n"
        "- Agreed Outcome: Agreed to review diagnostic benchmark.\n"
        "- Recorded Next Steps: Send pitch deck via WhatsApp on Monday."
    )

    original_post = httpx.Client.post

    def mock_gemini_api(self, url, headers=None, params=None, json=None, **kwargs):
        if "generativelanguage.googleapis.com" in str(url):
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {"text": structured_summary}
                            ]
                        }
                    }
                ]
            }
            return mock_resp
        return original_post(self, url, headers=headers, params=params, json=json, **kwargs)

    monkeypatch.setattr(httpx.Client, "post", mock_gemini_api)

    # 4. Close call
    close_res = client.post(
        f"/v1/calls/{call_id}/close",
        json={
            "final_outcome": "agreed_to_receive_report",
            "next_step": "Send pitch deck via WhatsApp",
            "last_stage_reached": 2
        }
    )
    assert close_res.status_code == 200
    closed_data = close_res.json()

    # Verify summary is the full generated text, NOT just "Arjun Reddy, founder"
    assert closed_data["summary"] == structured_summary
    assert closed_data["prospect_name"] == "Arjun Reddy"
    assert closed_data["prospect_role"] == "founder"
    assert closed_data["final_outcome"] == "agreed_to_receive_report"
    assert closed_data["next_step"] == "Send pitch deck via WhatsApp"

    # 5. Fetch full detail via GET /v1/calls/{id}
    detail_res = client.get(f"/v1/calls/{call_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()

    assert detail_data["summary"] == structured_summary
    assert len(detail_data["stage_results"]) == 2
    assert detail_data["stage_results"][0]["prospect_words"] == "Yes, Arjun here."
    assert detail_data["stage_results"][1]["prospect_words"] == "Tell me more about your evaluation framework."

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

def test_llm_service_truncated_max_tokens_fallback(monkeypatch, caplog):
    """
    Verifies that when Gemini returns finishReason='MAX_TOKENS' and retry also truncates,
    a sanitized warning is logged and the safe fallback 'Summary unavailable (AI response truncated)' is returned.
    """
    service = LLMService(api_key="mock-api-key-12345", model="gemini-3.8-flash")
    call, stage_results = create_sample_call_and_stage()

    def mock_truncated_post(self, url, headers=None, params=None, json=None, timeout=None, **kwargs):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "candidates": [
                {
                    "finishReason": "MAX_TOKENS",
                    "content": {
                        "parts": [
                            {"text": "- Conversation Recap: Contacted Anand Verma and started discuss"}
                        ]
                    }
                }
            ],
            "usageMetadata": {
                "promptTokenCount": 200,
                "candidatesTokenCount": 800,
                "totalTokenCount": 1000
            }
        }
        return mock_resp

    monkeypatch.setattr(httpx.Client, "post", mock_truncated_post)

    with caplog.at_level("WARNING"):
        summary = service.generate_summary(call, stage_results)

    assert summary == "Summary unavailable (AI response truncated)"
    assert "finishReason=MAX_TOKENS" in caplog.text

def test_llm_service_mid_sentence_truncation_retry_succeeds(monkeypatch):
    """
    Verifies that when initial attempt is cut off mid-sentence,
    the service automatically triggers a concise retry that succeeds.
    """
    service = LLMService(api_key="mock-api-key-12345", model="gemini-3.8-flash")
    call, stage_results = create_sample_call_and_stage()

    call_count = 0

    def mock_retry_post(self, url, headers=None, params=None, json=None, timeout=None, **kwargs):
        nonlocal call_count
        call_count += 1
        mock_resp = MagicMock()
        mock_resp.status_code = 200

        if call_count == 1:
            # First attempt cut off mid-sentence
            mock_resp.json.return_value = {
                "candidates": [
                    {
                        "finishReason": "MAX_TOKENS",
                        "content": {
                            "parts": [
                                {"text": "- Conversation Recap: Reached prospect and began discu"}
                            ]
                        }
                    }
                ]
            }
        else:
            # Second attempt (concise retry) succeeds with finishReason=STOP and complete text
            mock_resp.json.return_value = {
                "candidates": [
                    {
                        "finishReason": "STOP",
                        "content": {
                            "parts": [
                                {
                                    "text": (
                                        "- Conversation Recap: Contacted Rajesh Sharma.\n"
                                        "- Prospect Needs & Interests: Engineering plant diagnostics.\n"
                                        "- Objections or Concerns: None recorded.\n"
                                        "- Agreed Outcome: Agreed to receive report.\n"
                                        "- Recorded Next Steps: Send report on WhatsApp."
                                    )
                                }
                            ]
                        }
                    }
                ]
            }
        return mock_resp

    monkeypatch.setattr(httpx.Client, "post", mock_retry_post)
    summary = service.generate_summary(call, stage_results)

    assert call_count == 2
    assert "- Conversation Recap: Contacted Rajesh Sharma." in summary
    assert "- Recorded Next Steps: Send report on WhatsApp." in summary

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

