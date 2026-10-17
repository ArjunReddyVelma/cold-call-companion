"""
End-to-End Verification Script: Transcript T082 Integration Journey
Demonstrates the full live call workflow against the running FastAPI backend:
1. Start new call for Anand Verma (Modern Lighting Solutions).
2. Record Stage 1 (Opening, Visit 1).
3. Record Stage 2 (Purpose, Visit 1).
4. Advance to Stage 4 (Their Business, Visit 1).
5. Revisit Stage 2 (Purpose, Visit 2) — tests non-linear revisit and visit number increment.
6. Advance to Stage 7 (Next step, Visit 1).
7. End call with final_outcome='agreed_to_receive_report' and next_step='Send sample comparison report via WhatsApp'.
8. Verify immutable visit history, unchanged earlier records, verbatim prospect wording, and call listing.
"""

import os
import json
import sys
import urllib.request
import urllib.error

BASE_URL = (sys.argv[1] if len(sys.argv) > 1 else os.getenv("API_URL", "http://127.0.0.1:8000")).rstrip("/")

def make_request(method: str, path: str, data: dict = None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"} if data else {}
    body = json.dumps(data).encode("utf-8") if data else None

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            content = response.read().decode("utf-8")
            return status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        return e.code, json.loads(content) if content else {}
    except Exception as e:
        print(f"Network error connecting to {url}: {e}")
        sys.exit(1)

def run_t082_journey():
    print("=" * 70)
    print("EXECUTE T082 INTEGRATION JOURNEY: Modern Lighting Solutions")
    print("=" * 70)

    # 1. Health check
    print("\n[Step 0] Checking backend health...")
    status, health = make_request("GET", "/health")
    print(f"  Status {status}: {health}")
    assert status == 200, f"Health check failed: {health}"
    assert health["status"] == "ok"
    assert health["database"] == "connected"

    # 2. Stages catalog
    print("\n[Step 0b] Fetching official 8 stages catalog...")
    status, stages = make_request("GET", "/v1/stages")
    print(f"  Status {status}: Found {len(stages)} stages.")
    assert status == 200
    assert len(stages) == 8

    # 3. Step 1: Start Call
    print("\n[Step 1] Starting new call for Anand Verma (Modern Lighting Solutions)...")
    start_payload = {
        "prospect_name": "Anand Verma",
        "company_name": "Modern Lighting Solutions",
        "prospect_role": "Founder / Managing Director"
    }
    status, call = make_request("POST", "/v1/calls", start_payload)
    print(f"  Status {status}: Call ID = {call.get('id')}")
    assert status == 201, f"Failed to create call: {call}"
    call_id = call["id"]
    assert call["prospect_name"] == "Anand Verma"
    assert call["company_name"] == "Modern Lighting Solutions"
    assert call["is_closed"] is False
    assert call["last_stage_reached"] == 1

    # 4. Step 2: Record Stage 1 (Opening)
    print("\n[Step 2] Recording Stage 1 (Opening)...")
    stg1_payload = {
        "stage_number": 1,
        "selected_result": "Reached intended person",
        "prospect_words": "Yes, Anand speaking. What is this regarding?"
    }
    status, res1 = make_request("POST", f"/v1/calls/{call_id}/stages", stg1_payload)
    print(f"  Status {status}: Stage 1 recorded. Visit Number = {res1.get('visit_number')}")
    assert status in (200, 201)
    assert res1["stage_number"] == 1
    assert res1["visit_number"] == 1
    assert res1["prospect_words"] == "Yes, Anand speaking. What is this regarding?"

    # 5. Step 3: Record Stage 2 (Purpose, Visit 1)
    print("\n[Step 3] Recording Stage 2 (Purpose, Visit 1)...")
    stg2_payload1 = {
        "stage_number": 2,
        "selected_result": "Understood / allowed to continue",
        "prospect_words": "Understood. What kind of manufacturing assessments do you run?"
    }
    status, res2_v1 = make_request("POST", f"/v1/calls/{call_id}/stages", stg2_payload1)
    print(f"  Status {status}: Stage 2 Visit 1 recorded. Visit Number = {res2_v1.get('visit_number')}")
    assert status in (200, 201)
    assert res2_v1["stage_number"] == 2
    assert res2_v1["visit_number"] == 1
    assert res2_v1["prospect_words"] == "Understood. What kind of manufacturing assessments do you run?"

    # 6. Step 4: Advance to Stage 4 (Their business)
    print("\n[Step 4] Advancing to Stage 4 (Their business, Visit 1)...")
    stg4_payload = {
        "stage_number": 4,
        "selected_result": "Shared business context",
        "prospect_words": "We manufacture die-cast aluminum outdoor lighting housings in Vasai."
    }
    status, res4 = make_request("POST", f"/v1/calls/{call_id}/stages", stg4_payload)
    print(f"  Status {status}: Stage 4 recorded. Visit Number = {res4.get('visit_number')}")
    assert status in (200, 201)
    assert res4["stage_number"] == 4
    assert res4["visit_number"] == 1
    assert res4["prospect_words"] == "We manufacture die-cast aluminum outdoor lighting housings in Vasai."

    # 7. Step 5: Revisit Stage 2 (Purpose, Visit 2)
    print("\n[Step 5] Revisit Stage 2 (Purpose, Visit 2) — Non-linear progression...")
    stg2_payload2 = {
        "stage_number": 2,
        "selected_result": "Asked what we do",
        "prospect_words": "Can you clarify whether your diagnostic report covers plant floor defect reduction or only sales?"
    }
    status, res2_v2 = make_request("POST", f"/v1/calls/{call_id}/stages", stg2_payload2)
    print(f"  Status {status}: Stage 2 Visit 2 recorded. Visit Number = {res2_v2.get('visit_number')}")
    assert status in (200, 201)
    assert res2_v2["stage_number"] == 2
    assert res2_v2["visit_number"] == 2
    assert res2_v2["prospect_words"] == "Can you clarify whether your diagnostic report covers plant floor defect reduction or only sales?"

    # 8. Step 6: Advance to Stage 7 (Next step)
    print("\n[Step 6] Advancing to Stage 7 (Next step, Visit 1)...")
    stg7_payload = {
        "stage_number": 7,
        "selected_result": "Agreed to report via WhatsApp",
        "prospect_words": "Send sample comparison report to my direct WhatsApp, I will review on weekend."
    }
    status, res7 = make_request("POST", f"/v1/calls/{call_id}/stages", stg7_payload)
    print(f"  Status {status}: Stage 7 recorded. Visit Number = {res7.get('visit_number')}")
    assert status in (200, 201)
    assert res7["stage_number"] == 7
    assert res7["visit_number"] == 1
    assert res7["prospect_words"] == "Send sample comparison report to my direct WhatsApp, I will review on weekend."

    # 9. Step 7 & 8: End Call with outcome and next step
    print("\n[Step 7 & 8] Closing call: outcome=agreed_to_receive_report, next_step='Send sample comparison report via WhatsApp'...")
    close_payload = {
        "final_outcome": "agreed_to_receive_report",
        "next_step": "Send sample comparison report via WhatsApp",
        "next_step_at": None
    }
    status, closed_call = make_request("POST", f"/v1/calls/{call_id}/close", close_payload)
    print(f"  Status {status}: Call closed successfully.")
    assert status == 200
    assert closed_call["is_closed"] is True
    assert closed_call["final_outcome"] == "agreed_to_receive_report"
    assert closed_call["next_step"] == "Send sample comparison report via WhatsApp"
    assert closed_call["last_stage_reached"] == 7
    print(f"  AI Summary Result: {closed_call.get('summary')}")

    # 10. Step 9: Full Detail Verification
    print("\n[Step 9] Retrieving call details via GET /v1/calls/{call_id}...")
    status, call_detail = make_request("GET", f"/v1/calls/{call_id}")
    assert status == 200

    visits = call_detail["stage_results"]
    print(f"  Total Stage Visits Persisted: {len(visits)}")
    assert len(visits) == 5, f"Expected 5 visits, got {len(visits)}"

    # Check Stage 2 visits specifically
    stage2_visits = [v for v in visits if v["stage_number"] == 2]
    print(f"  Stage 2 Visits Found: {len(stage2_visits)}")
    assert len(stage2_visits) == 2, "Expected exactly 2 visits for Stage 2"

    v1, v2 = stage2_visits[0], stage2_visits[1]
    assert v1["visit_number"] == 1
    assert v1["selected_result"] == "Understood / allowed to continue"
    assert v1["prospect_words"] == "Understood. What kind of manufacturing assessments do you run?"

    assert v2["visit_number"] == 2
    assert v2["selected_result"] == "Asked what we do"
    assert v2["prospect_words"] == "Can you clarify whether your diagnostic report covers plant floor defect reduction or only sales?"

    print("  ✓ Verification SUCCESS: Earlier visit record (Visit 1) remained 100% UNCHANGED when Visit 2 was appended!")
    print("  ✓ Verification SUCCESS: Verbatim prospect words preserved with exact character fidelity!")

    # 11. Step 10: History list check
    print("\n[Step 10] Checking call appears in Past Calls list via GET /v1/calls...")
    status, history = make_request("GET", "/v1/calls")
    assert status == 200
    matching = [c for c in history["items"] if c["id"] == call_id]
    assert len(matching) == 1
    print(f"  ✓ Call {call_id} found in history list. Total calls in system: {history['total']}")

    print("\n" + "=" * 70)
    print("ALL INTEGRATION CHECKS PASSED FOR T082 JOURNEY!")
    print("=" * 70)
    return call_id

if __name__ == "__main__":
    run_t082_journey()
