from unittest.mock import MagicMock
from app.database import get_db
from app.main import app

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "cold-call-companion-backend"
    assert data["database"] == "connected"
    assert "timestamp" in data

def test_health_endpoint_db_failure(client):
    mock_db = MagicMock()
    mock_db.execute.side_effect = Exception("Connection terminated by administrator")

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        response = client.get("/health")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert "unhealthy: Connection terminated by administrator" in data["database"]
    finally:
        del app.dependency_overrides[get_db]
