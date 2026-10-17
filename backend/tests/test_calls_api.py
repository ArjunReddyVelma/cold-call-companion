import pytest

def test_start_call(client):
    payload = {
        "prospect_name": "Dr. Anjali Menon",
        "company_name": "Menon Family Clinic",
        "prospect_role": "Owner"
    }
    response = client.post("/v1/calls", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["prospect_name"] == "Dr. Anjali Menon"
    assert data["company_name"] == "Menon Family Clinic"
    assert data["prospect_role"] == "Owner"
    assert data["last_stage_reached"] == 1
    assert data["is_closed"] is False
    assert data["final_outcome"] is None

def test_start_call_optional_fields(client):
    response = client.post("/v1/calls", json={})
    assert response.status_code == 201
    data = response.json()
    assert data["prospect_name"] is None
    assert data["company_name"] is None
    assert data["last_stage_reached"] == 1

def test_stage_persistence_and_visit_increment(client):
    # 1. Start call
    call_res = client.post("/v1/calls", json={"company_name": "Acme Corp"})
    call_id = call_res.json()["id"]

    # 2. Record Stage 1 visit 1
    s1_res = client.post(
        f"/v1/calls/{call_id}/stages",
        json={
            "stage_number": 1,
            "selected_result": "Reached intended person",
            "prospect_words": "Speaking, who is this?"
        }
    )
    assert s1_res.status_code == 201
    s1_data = s1_res.json()
    assert s1_data["stage_number"] == 1
    assert s1_data["visit_number"] == 1
    assert s1_data["selected_result"] == "Reached intended person"
    assert s1_data["prospect_words"] == "Speaking, who is this?"

    # 3. Advance to Stage 2 visit 1
    s2_res = client.post(
        f"/v1/calls/{call_id}/stages",
        json={
            "stage_number": 2,
            "selected_result": "Asked what we do",
            "prospect_words": "What does a growth audit mean?"
        }
    )
    assert s2_res.status_code == 201
    s2_data = s2_res.json()
    assert s2_data["stage_number"] == 2
    assert s2_data["visit_number"] == 1

    # Check that call's last_stage_reached updated to 2
    call_get = client.get(f"/v1/calls/{call_id}").json()
    assert call_get["last_stage_reached"] == 2

    # 4. Re-visit Stage 1 (e.g., prospect asks for caller details again)
    s1_revisit = client.post(
        f"/v1/calls/{call_id}/stages",
        json={
            "stage_number": 1,
            "selected_result": "Reached intended person",
            "prospect_words": "Can you repeat your company name?"
        }
    )
    assert s1_revisit.status_code == 201
    revisit_data = s1_revisit.json()
    assert revisit_data["stage_number"] == 1
    # MUST BE VISIT 2!
    assert revisit_data["visit_number"] == 2
    assert revisit_data["prospect_words"] == "Can you repeat your company name?"

    # Verify call detail contains both visits for Stage 1 intact!
    detail = client.get(f"/v1/calls/{call_id}").json()
    stages = detail["stage_results"]
    assert len(stages) == 3
    s1_visits = [s for s in stages if s["stage_number"] == 1]
    assert len(s1_visits) == 2
    assert s1_visits[0]["visit_number"] == 1
    assert s1_visits[0]["prospect_words"] == "Speaking, who is this?"
    assert s1_visits[1]["visit_number"] == 2
    assert s1_visits[1]["prospect_words"] == "Can you repeat your company name?"

def test_reject_invalid_stage_number(client):
    call_res = client.post("/v1/calls", json={})
    call_id = call_res.json()["id"]

    # Stage 0 is invalid
    res_0 = client.post(
        f"/v1/calls/{call_id}/stages",
        json={"stage_number": 0, "selected_result": "Test"}
    )
    assert res_0.status_code in [400, 422]

    # Stage 9 is invalid
    res_9 = client.post(
        f"/v1/calls/{call_id}/stages",
        json={"stage_number": 9, "selected_result": "Test"}
    )
    assert res_9.status_code in [400, 422]

def test_reject_writes_to_closed_call(client):
    call_res = client.post("/v1/calls", json={"prospect_name": "Test Prospect"})
    call_id = call_res.json()["id"]

    # Close call
    close_res = client.post(
        f"/v1/calls/{call_id}/close",
        json={
            "final_outcome": "not_interested",
            "next_step": "None",
            "last_stage_reached": 3
        }
    )
    assert close_res.status_code == 200
    assert close_res.json()["is_closed"] is True

    # Attempt to write stage result to closed call
    stage_res = client.post(
        f"/v1/calls/{call_id}/stages",
        json={"stage_number": 4, "selected_result": "Shared context"}
    )
    assert stage_res.status_code == 400
    assert "closed call" in stage_res.json()["detail"].lower()

def test_close_early_preserves_outcome_and_last_stage(client):
    call_res = client.post("/v1/calls", json={"company_name": "Rapid Print"})
    call_id = call_res.json()["id"]

    # Progress to stage 3
    client.post(
        f"/v1/calls/{call_id}/stages",
        json={"stage_number": 1, "selected_result": "Reached intended person"}
    )
    client.post(
        f"/v1/calls/{call_id}/stages",
        json={"stage_number": 3, "selected_result": "Declined / not now"}
    )

    # End call early at stage 3
    close_res = client.post(
        f"/v1/calls/{call_id}/close",
        json={
            "final_outcome": "follow_up",
            "next_step": "Call back tomorrow at 2 PM",
            "last_stage_reached": 3
        }
    )
    assert close_res.status_code == 200
    data = close_res.json()
    assert data["is_closed"] is True
    assert data["final_outcome"] == "follow_up"
    assert data["next_step"] == "Call back tomorrow at 2 PM"
    assert data["last_stage_reached"] == 3
    assert data["ended_at"] is not None

def test_all_10_distinct_outcomes_supported(client):
    outcomes = [
        "agreed_to_receive_report",
        "next_step_agreed",
        "interested",
        "follow_up",
        "call_again",
        "not_interested",
        "do_not_call",
        "wrong_person",
        "moved_company",
        "not_logged"
    ]

    for outcome in outcomes:
        call = client.post("/v1/calls", json={"prospect_name": f"Test {outcome}"}).json()
        cid = call["id"]
        res = client.post(
            f"/v1/calls/{cid}/close",
            json={"final_outcome": outcome, "last_stage_reached": 1}
        )
        assert res.status_code == 200
        assert res.json()["final_outcome"] == outcome

def test_call_history_and_stages_endpoints(client):
    # Create 2 calls
    c1 = client.post("/v1/calls", json={"prospect_name": "Alpha"}).json()
    c2 = client.post("/v1/calls", json={"prospect_name": "Beta"}).json()

    # List calls
    list_res = client.get("/v1/calls")
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] >= 2
    assert len(data["items"]) >= 2

    # Get stage definitions
    stages_res = client.get("/v1/stages")
    assert stages_res.status_code == 200
    stages = stages_res.json()
    assert len(stages) == 8
    assert stages[0]["name"] == "Opening"
    assert stages[7]["name"] == "Close"
    for s in stages:
        assert len(s["likely_responses"]) == 3
        assert len(s["quick_tap_options"]) >= 4

def test_nonexistent_call_returns_404(client):
    fake_id = "00000000-0000-0000-0000-000000000000"
    
    # Stage write to nonexistent call
    res_stage = client.post(
        f"/v1/calls/{fake_id}/stages",
        json={"stage_number": 1, "selected_result": "Test"}
    )
    assert res_stage.status_code == 404
    assert "not found" in res_stage.json()["detail"].lower()

    # Close nonexistent call
    res_close = client.post(
        f"/v1/calls/{fake_id}/close",
        json={"final_outcome": "not_interested"}
    )
    assert res_close.status_code == 404

    # Get detail for nonexistent call
    res_get = client.get(f"/v1/calls/{fake_id}")
    assert res_get.status_code == 404

def test_interleaved_stage_revisits(client):
    call_res = client.post("/v1/calls", json={"company_name": "Interleaved Test Co"})
    call_id = call_res.json()["id"]

    # Sequence: 1 -> 2 -> 3 -> 2 -> 1 -> 2
    client.post(f"/v1/calls/{call_id}/stages", json={"stage_number": 1, "selected_result": "S1 V1"})
    client.post(f"/v1/calls/{call_id}/stages", json={"stage_number": 2, "selected_result": "S2 V1"})
    client.post(f"/v1/calls/{call_id}/stages", json={"stage_number": 3, "selected_result": "S3 V1"})
    client.post(f"/v1/calls/{call_id}/stages", json={"stage_number": 2, "selected_result": "S2 V2"})
    client.post(f"/v1/calls/{call_id}/stages", json={"stage_number": 1, "selected_result": "S1 V2"})
    client.post(f"/v1/calls/{call_id}/stages", json={"stage_number": 2, "selected_result": "S2 V3"})

    detail = client.get(f"/v1/calls/{call_id}").json()
    stages = detail["stage_results"]
    assert len(stages) == 6

    # Verify visit counts per stage
    s1 = [s for s in stages if s["stage_number"] == 1]
    s2 = [s for s in stages if s["stage_number"] == 2]
    s3 = [s for s in stages if s["stage_number"] == 3]

    assert [s["visit_number"] for s in s1] == [1, 2]
    assert [s["visit_number"] for s in s2] == [1, 2, 3]
    assert [s["visit_number"] for s in s3] == [1]

def test_verbatim_prospect_words_preserved_faithfully(client):
    call = client.post("/v1/calls", json={"prospect_name": "Test Words"}).json()
    cid = call["id"]

    complex_quote = '“Accounting for what? We have a CA who handles everything — don\'t call back!”'
    res = client.post(
        f"/v1/calls/{cid}/stages",
        json={
            "stage_number": 2,
            "selected_result": "Challenged as sales pitch / cost",
            "prospect_words": complex_quote
        }
    )
    assert res.status_code == 201
    assert res.json()["prospect_words"] == complex_quote

    # Retrieve call and verify quote survives unchanged
    detail = client.get(f"/v1/calls/{cid}").json()
    saved_stage = detail["stage_results"][0]
    assert saved_stage["prospect_words"] == complex_quote

def test_pagination_and_ordering(client):
    # Create 5 calls
    ids = []
    for i in range(5):
        c = client.post("/v1/calls", json={"prospect_name": f"User {i}"}).json()
        ids.append(c["id"])

    # Page 1: limit 2, offset 0
    p1 = client.get("/v1/calls?limit=2&offset=0").json()
    assert len(p1["items"]) == 2
    assert p1["total"] >= 5

    # Page 2: limit 2, offset 2
    p2 = client.get("/v1/calls?limit=2&offset=2").json()
    assert len(p2["items"]) == 2
    # Ensure items don't overlap
    p1_ids = {x["id"] for x in p1["items"]}
    p2_ids = {x["id"] for x in p2["items"]}
    assert p1_ids.isdisjoint(p2_ids)

def test_create_call_returns_string_id_and_validates(client):
    """
    Regression test: ensures POST /v1/calls returns HTTP 201, a valid string id,
    and adheres to the frontend contract.
    """
    import uuid
    res = client.post("/v1/calls", json={"prospect_name": "Test Prospect", "company_name": "Test Co"})
    assert res.status_code == 201
    data = res.json()
    assert "id" in data
    assert isinstance(data["id"], str)
    # Verify standard 36-char hyphenated UUID string
    parsed_uuid = uuid.UUID(data["id"])
    assert str(parsed_uuid) == data["id"]
    assert data["is_closed"] is False

def test_uuid_object_response_validation_regression():
    """
    Regression test for the Render PostgreSQL bug:
    Verifies that CallResponse and CallStageResultResponse validate when the underlying
    database driver (such as psycopg2 on PostgreSQL) supplies actual Python uuid.UUID objects,
    and confirms they serialize cleanly to JSON strings at the response boundary.
    """
    import uuid
    from datetime import datetime
    from app.models.schemas import CallResponse, CallStageResultResponse, CallListResponse

    call_uuid = uuid.uuid4()
    stage_uuid = uuid.uuid4()

    class MockPgStageResult:
        id = stage_uuid  # Python UUID object
        call_id = call_uuid  # Python UUID object
        stage_number = 1
        visit_number = 1
        selected_result = "Reached intended person"
        prospect_words = "Speaking"
        created_at = datetime.utcnow()
        updated_at = datetime.utcnow()

    class MockPgCall:
        id = call_uuid  # Python UUID object
        prospect_name = "Anand Verma"
        company_name = "Modern Lighting Solutions"
        prospect_role = "Founder"
        started_at = datetime.utcnow()
        ended_at = None
        last_stage_reached = 1
        final_outcome = None
        next_step = None
        next_step_at = None
        summary = None
        is_closed = False
        created_at = datetime.utcnow()
        updated_at = datetime.utcnow()
        stage_results = [MockPgStageResult()]

    # 1. Validate CallStageResultResponse from Python UUID attributes
    stage_resp = CallStageResultResponse.model_validate(MockPgStageResult())
    assert isinstance(stage_resp.id, uuid.UUID)
    assert isinstance(stage_resp.call_id, uuid.UUID)
    # Check serialization mode='json'
    stage_json = stage_resp.model_dump(mode="json")
    assert isinstance(stage_json["id"], str)
    assert stage_json["id"] == str(stage_uuid)
    assert isinstance(stage_json["call_id"], str)
    assert stage_json["call_id"] == str(call_uuid)

    # 2. Validate CallResponse from Python UUID attributes
    call_resp = CallResponse.model_validate(MockPgCall())
    assert isinstance(call_resp.id, uuid.UUID)
    call_json = call_resp.model_dump(mode="json")
    assert isinstance(call_json["id"], str)
    assert call_json["id"] == str(call_uuid)
    assert isinstance(call_json["stage_results"][0]["id"], str)
    assert isinstance(call_json["stage_results"][0]["call_id"], str)

    # 3. Validate CallListResponse
    list_resp = CallListResponse(items=[call_resp], total=1)
    list_json = list_resp.model_dump(mode="json")
    assert isinstance(list_json["items"][0]["id"], str)
    assert list_json["items"][0]["id"] == str(call_uuid)

