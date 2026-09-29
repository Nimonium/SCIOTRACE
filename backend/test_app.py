"""
Automated Integration and Unit Test Suite for Social Pulse AI Backend.
Tests all endpoints, JSON response shapes, schema validation, and pipeline stages.
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from db import init_db
from ingest import load_seed_data
from nlp import batch_classify_and_update

client = TestClient(app)


@pytest.fixture(autouse=True)
def mock_gemini_offline(monkeypatch):
    """
    Ensure test suite runs 100% offline and deterministic without external API network latency.
    """
    monkeypatch.setattr("nlp._get_gemini_client", lambda: None)
    monkeypatch.setattr("ask_service._get_gemini_client", lambda: None)


@pytest.fixture(autouse=True)
def setup_test_data(mock_gemini_offline):
    init_db()
    load_seed_data()
    batch_classify_and_update()


def test_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data


def test_seed_ingest():
    response = client.post("/api/v1/ingest/seed")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["events_count"] > 0


def test_get_narratives():
    response = client.get("/api/v1/narratives")
    assert response.status_code == 200
    data = response.json()
    assert "narratives" in data
    assert len(data["narratives"]) >= 1

    first = data["narratives"][0]
    required_keys = [
        "id", "topic", "momentum", "momentum_state", "breakout_probability",
        "sentiment", "sentiment_delta", "spread_path", "first_seen", "last_updated", "alert_level"
    ]
    for key in required_keys:
        assert key in first, f"Key '{key}' missing from narratives response"
    assert isinstance(first["spread_path"], list)
    assert isinstance(first["momentum"], (int, float))


def test_get_narrative_dna():
    response = client.get("/api/v1/narratives/narrative-policy-fee-hike")
    assert response.status_code == 200
    data = response.json()
    required_keys = ["id", "topic", "core_claim", "origin", "mutation", "why_now", "confidence", "forecast"]
    for key in required_keys:
        assert key in data, f"Key '{key}' missing from narrative DNA response"
    
    # Check origin schema
    assert "platform" in data["origin"]
    assert "community" in data["origin"]
    assert "timestamp" in data["origin"]

    # Check mutation schema
    assert isinstance(data["mutation"], list)
    if data["mutation"]:
        assert "community" in data["mutation"][0]
        assert "reframe" in data["mutation"][0]

    # Check forecast schema
    forecast_keys = ["expected_reach", "communities_affected", "expected_duration_hours", "breakout_probability"]
    for f_key in forecast_keys:
        assert f_key in data["forecast"], f"Forecast key '{f_key}' missing"


def test_get_narrative_timeline():
    response = client.get("/api/v1/narratives/narrative-policy-fee-hike/timeline")
    assert response.status_code == 200
    data = response.json()
    assert "events" in data
    assert "sentiment_series" in data

    if data["events"]:
        ev = data["events"][0]
        for key in ["time", "type", "actor", "sentiment"]:
            assert key in ev, f"Event key '{key}' missing"

    if data["sentiment_series"]:
        series = data["sentiment_series"][0]
        assert "time" in series
        assert "curiosity" in series
        assert "anger" in series


def test_get_narrative_network():
    response = client.get("/api/v1/narratives/narrative-policy-fee-hike/network")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) > 0

    node = data["nodes"][0]
    for key in ["id", "role", "influence_score", "community"]:
        assert key in node, f"Node key '{key}' missing"
    assert node["role"] in ["originator", "amplifier", "bridge", "authority"]

    if data["edges"]:
        edge = data["edges"][0]
        for key in ["source", "target", "type", "time"]:
            assert key in edge, f"Edge key '{key}' missing"


def test_get_trends():
    response = client.get("/api/v1/trends")
    assert response.status_code == 200
    data = response.json()
    assert "trends" in data
    assert len(data["trends"]) >= 1
    trend = data["trends"][0]
    for key in ["id", "topic", "momentum", "momentum_history", "state", "breakout_probability"]:
        assert key in trend, f"Trend key '{key}' missing"
    assert isinstance(trend["momentum_history"], list)


def test_get_alerts():
    response = client.get("/api/v1/alerts")
    assert response.status_code == 200
    data = response.json()
    assert "alerts" in data
    assert len(data["alerts"]) >= 1
    alert = data["alerts"][0]
    for key in ["narrative_id", "level", "headline", "time"]:
        assert key in alert, f"Alert key '{key}' missing"
    assert alert["level"] in ["critical", "accelerating", "emerging"]


def test_ask_endpoint():
    response = client.post("/api/v1/ask", json={"query": "Who started the fee hike narrative and why is it going viral?"})
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "evidence" in data
    assert "confidence" in data
    assert "narrative_id" in data["evidence"]
    assert isinstance(data["evidence"]["show"], list)
    assert len(data["answer"]) > 20


def test_get_demographics():
    response = client.get("/api/v1/demographics/narrative-policy-fee-hike")
    assert response.status_code == 200
    data = response.json()
    for key in ["age_brackets", "top_language", "top_region", "audience_tribes"]:
        assert key in data, f"Demographics key '{key}' missing"
    assert isinstance(data["age_brackets"], dict)
    assert isinstance(data["audience_tribes"], list)


def test_get_narrative_communities():
    response = client.get("/api/v1/narratives/narrative-policy-fee-hike/communities")
    assert response.status_code == 200
    data = response.json()
    assert "communities" in data
    assert len(data["communities"]) >= 1
    comm = data["communities"][0]
    expected_keys = [
        "community_id", "label", "participant_count",
        "dominant_sentiment", "dominant_sentiment_pct",
        "dominant_emotion", "avg_engagement", "platforms"
    ]
    for k in expected_keys:
        assert k in comm, f"Community key '{k}' missing"
    assert isinstance(comm["platforms"], list)
    assert isinstance(comm["dominant_sentiment_pct"], float)
    assert isinstance(comm["avg_engagement"], float)


def test_ingest_event_clustering_existing_and_new():
    # 1. Post matching existing narrative (Fee Hike)
    related_post = {
        "platform": "x",
        "author_id": "test_student_activist_handle",
        "content": "Mass student protest organized against the unfair national exam fee hike circular! #RollbackFeeHike"
    }
    res1 = client.post("/api/v1/ingest/event", json=related_post)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "success"
    assert data1["narrative_id"] == "narrative-policy-fee-hike"
    assert data1["is_new_narrative"] is False
    assert "topics" in data1["nlp"]
    assert "entities" in data1["nlp"]

    # 2. Post with completely unrelated topic (Quantum / Astrophysics)
    unrelated_post = {
        "platform": "x",
        "author_id": "astronomy_lab_official",
        "content": "Deep space observatory captures unprecedented spectroscopic data from distant exoplanet atmosphere."
    }
    res2 = client.post("/api/v1/ingest/event", json=unrelated_post)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["status"] == "success"
    assert data2["is_new_narrative"] is True
    assert data2["narrative_id"] != "narrative-policy-fee-hike"
    assert data2["narrative_id"].startswith("narrative-")


def test_early_signal_detection_and_alerts():
    from trends import detect_early_signal

    # Direct function checks
    metro_signal = detect_early_signal("narrative-metro-ai-pilot")
    assert metro_signal is not None, "narrative-metro-ai-pilot should qualify as early signal"
    assert "mention_growth_pct" in metro_signal
    assert "new_communities" in metro_signal
    assert "cross_platform_movement" in metro_signal
    assert metro_signal["status"] == "WATCH"
    assert metro_signal["mention_growth_pct"] >= 100

    fee_signal = detect_early_signal("narrative-policy-fee-hike")
    assert fee_signal is None, "viral fee hike narrative should not qualify as early signal"

    # API endpoint check
    res = client.get("/api/v1/alerts")
    assert res.status_code == 200
    alerts = res.json()["alerts"]
    metro_alert = next((a for a in alerts if a["narrative_id"] == "narrative-metro-ai-pilot"), None)
    assert metro_alert is not None
    assert "early_signal" in metro_alert
    assert metro_alert["early_signal"]["status"] == "WATCH"

    fee_alert = next((a for a in alerts if a["narrative_id"] == "narrative-policy-fee-hike"), None)
    assert fee_alert is not None
    assert "early_signal" not in fee_alert, "Non-qualifying alerts must omit early_signal field"


def test_mutation_journey_endpoint():
    for nid in ["narrative-policy-fee-hike", "narrative-metro-ai-pilot"]:
        res = client.get(f"/api/v1/narratives/{nid}/mutation-journey")
        assert res.status_code == 200
        data = res.json()
        assert data["narrative_id"] == nid
        assert "emotion_journey" in data
        assert isinstance(data["emotion_journey"], list)
        assert "stages" in data
        assert isinstance(data["stages"], list)
        assert len(data["stages"]) >= 1

        timestamps = []
        for idx, stage in enumerate(data["stages"]):
            assert stage["stage"] == idx + 1
            for k in ["community_label", "reframe", "dominant_emotion", "timestamp"]:
                assert k in stage, f"Key '{k}' missing from mutation stage"
            timestamps.append(stage["timestamp"])

        # Chronological ordering check
        assert timestamps == sorted(timestamps), "Stages must be sorted chronologically"
        assert data["emotion_journey"] == [s["dominant_emotion"] for s in data["stages"]]


def test_social_temperature_fields():
    # 1. Check GET /api/v1/narratives overview items
    res = client.get("/api/v1/narratives")
    assert res.status_code == 200
    narratives = res.json()["narratives"]
    for n in narratives:
        assert "social_temperature" in n, "social_temperature missing from overview item"
        assert "social_temperature_state" in n, "social_temperature_state missing from overview item"
        assert 0.0 <= n["social_temperature"] <= 100.0
        assert n["social_temperature_state"] in ["calm", "warming", "heated", "critical"]

    # 2. Check individual GET /api/v1/narratives/{id}
    res_fee = client.get("/api/v1/narratives/narrative-policy-fee-hike")
    assert res_fee.status_code == 200
    fee_data = res_fee.json()
    assert "social_temperature" in fee_data
    assert "social_temperature_state" in fee_data
    assert fee_data["social_temperature_state"] in ["heated", "critical"]

    res_metro = client.get("/api/v1/narratives/narrative-metro-ai-pilot")
    assert res_metro.status_code == 200
    metro_data = res_metro.json()
    assert "social_temperature" in metro_data
    assert "social_temperature_state" in metro_data
    assert metro_data["social_temperature_state"] in ["calm", "warming"]



