"""
SCIOTRACE - FastAPI Backend Application
NTRO Problem Statement 26152 (Social Media Analytics)

Fixed REST API providing ingestion, NLP emotion/sentiment intelligence,
trend momentum scoring, interaction graphs with Louvain communities & influence roles,
Narrative DNA objects, timeline progression, aggregate demographics, and natural language Q&A.
"""

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uvicorn
import uuid
import json
from datetime import datetime, timezone
import logging

from db import init_db, fetch_all_events, insert_events, reset_database_to_seed
from ingest import (
    load_seed_data,
    normalize_telegram_message,
    normalize_x_post
)
from nlp import batch_classify_and_update, classify_text_with_gemini, get_nlp_usage_metrics, reset_nlp_metrics
from trends import get_trends_list, get_alerts_list, calculate_narrative_momentum, reset_narrative_metadata
from graph import build_narrative_graph
from narrative import (
    get_narratives_overview_list,
    get_narrative_dna,
    get_narrative_timeline,
    get_demographics,
    get_community_dna,
    get_mutation_journey,
    assign_narrative
)
from ask_service import answer_query
from telegram_service import ingest_live_telegram_stream, has_live_telegram_data

# Logging setup
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("social_pulse_ai")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes DB schema and loads seed data if database is empty on app startup."""
    init_db()
    existing = fetch_all_events()
    if not existing:
        logger.info("Initializing fresh database with high-fidelity seed narratives...")
        load_seed_data()
        batch_classify_and_update()
        logger.info("SCIOTRACE initialized and ready.")
    else:
        logger.info(f"Loaded existing database with {len(existing)} events.")
    yield


# Initialize FastAPI application
app = FastAPI(
    title="SCIOTRACE - Intelligence Backend",
    description="Social media narrative intelligence, momentum forecasting, graph analytics, and Q&A engine.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS enabled for all origins (per requirements)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# Pydantic Schemas for Request / Response
# ==========================================

class AskRequest(BaseModel):
    query: str = Field(..., description="Natural language question about a social media narrative")

class RawIngestRequest(BaseModel):
    narrative_id: Optional[str] = None
    data: Dict[str, Any] = Field(..., description="Raw post payload")

class SingleEventIngestRequest(BaseModel):
    platform: str = Field(..., description="Platform: x, telegram, etc.")
    author_id: str = Field(..., description="Unique author or handle identifier")
    author_name: Optional[str] = None
    content: str = Field(..., description="Text content of the post")
    timestamp: Optional[str] = None
    parent_id: Optional[str] = None
    interaction_type: Optional[str] = "post"
    engagement_score: Optional[int] = 100


# ==========================================
# Endpoints
# ==========================================

@app.get("/")
def root():
    """Root endpoint providing direct navigation."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")

@app.get("/api/v1/health")
def health_check():
    """Health check endpoint for status validation."""
    return {
        "status": "healthy",
        "service": "SCIOTRACE Backend",
        "version": "1.0.0"
    }


@app.post("/api/v1/ingest/seed")
def ingest_seed_endpoint():
    """
    POST /api/v1/ingest/seed
    Loads realistic synthetic multi-platform social events for demo purposes.
    """
    res = load_seed_data()
    # Run NLP classification on seed data
    batch_classify_and_update()
    return res


@app.post("/api/v1/ingest/telegram")
def ingest_telegram_endpoint(payload: RawIngestRequest):
    """Ingests and normalizes a live raw Telegram message."""
    event = normalize_telegram_message(payload.data, narrative_id=payload.narrative_id)
    insert_events([event])
    return {"status": "success", "event_id": event["id"]}


@app.post("/api/v1/ingest/x")
def ingest_x_endpoint(payload: RawIngestRequest):
    """Ingests and normalizes a live raw X / Twitter tweet."""
    event = normalize_x_post(payload.data, narrative_id=payload.narrative_id)
    insert_events([event])
    return {"status": "success", "event_id": event["id"]}


@app.post("/api/v1/ingest/event")
def ingest_single_event(payload: SingleEventIngestRequest):
    """
    POST /api/v1/ingest/event
    Accepts a single raw event and runs it through the full pipeline:
    1. NLP classification (sentiment, emotion, sarcasm, topics, entities)
    2. Real heuristic narrative assignment / clustering
    3. Storage in SQLite event store
    4. Trend momentum recalculation for the affected narrative
    """
    raw_dict = payload.model_dump()
    ts = payload.timestamp or datetime.now(timezone.utc).isoformat()
    prefix = payload.platform.lower()[:2]
    event_id = f"{prefix}_{uuid.uuid4().hex[:10]}"
    
    # 1. NLP classification
    nlp_res = classify_text_with_gemini(payload.content)
    
    # 2. Heuristic narrative clustering / assignment
    event_pre = {
        **raw_dict,
        "id": event_id,
        "timestamp": ts,
        "topics": nlp_res.get("topics", []),
        "entities": nlp_res.get("entities", [])
    }
    assigned_nid, assigned_topic, is_new = assign_narrative(event_pre)
    
    # 3. Store event in SQLite
    normalized_event = {
        "id": event_id,
        "platform": payload.platform.lower(),
        "author_id": payload.author_id,
        "author_name": payload.author_name or payload.author_id,
        "content": payload.content,
        "timestamp": ts,
        "parent_id": payload.parent_id,
        "interaction_type": payload.interaction_type or "post",
        "community_id": 0,
        "narrative_id": assigned_nid,
        "sentiment": nlp_res["sentiment"],
        "emotion": nlp_res["emotion"],
        "sarcasm_flag": 1 if nlp_res.get("sarcasm_flag") else 0,
        "engagement_score": payload.engagement_score or 100,
        "raw_metadata": json.dumps(raw_dict),
        "topics": nlp_res.get("topics", []),
        "entities": nlp_res.get("entities", [])
    }
    insert_events([normalized_event])
    
    # 4. Momentum recalculation
    trend = calculate_narrative_momentum(assigned_nid)
    
    return {
        "status": "success",
        "event_id": event_id,
        "narrative_id": assigned_nid,
        "assigned_topic": assigned_topic,
        "is_new_narrative": is_new,
        "nlp": {
            "sentiment": nlp_res["sentiment"],
            "emotion": nlp_res["emotion"],
            "sarcasm_flag": nlp_res["sarcasm_flag"],
            "topics": nlp_res.get("topics", []),
            "entities": nlp_res.get("entities", [])
        },
        "current_momentum": trend["momentum"],
        "momentum_state": trend["state"]
    }


@app.get("/api/v1/narratives")
def get_narratives():
    """
    GET /api/v1/narratives
    Returns: {"narratives": [{id, topic, momentum, momentum_state, breakout_probability, sentiment, sentiment_delta, spread_path, first_seen, last_updated, alert_level}]}
    """
    narratives = get_narratives_overview_list()
    return {"narratives": narratives}


@app.get("/api/v1/narratives/{narrative_id}")
def get_single_narrative_dna(narrative_id: str):
    """
    GET /api/v1/narratives/{id}
    Returns: {id, topic, core_claim, origin: {platform, community, timestamp}, mutation: [{community, reframe}], why_now: [strings], confidence, forecast: {expected_reach, communities_affected, expected_duration_hours, breakout_probability}}
    """
    dna = get_narrative_dna(narrative_id)
    return dna


@app.get("/api/v1/narratives/{narrative_id}/timeline")
def get_timeline(narrative_id: str):
    """
    GET /api/v1/narratives/{id}/timeline
    Returns: {events: [{time, type, actor, sentiment}], sentiment_series: [{time, <emotion>: 0-1, ...}]}
    """
    timeline = get_narrative_timeline(narrative_id)
    return timeline


@app.get("/api/v1/narratives/{narrative_id}/network")
def get_network(narrative_id: str):
    """
    GET /api/v1/narratives/{id}/network
    Returns: {nodes: [{id, role (originator|amplifier|bridge|authority), influence_score (0-1), community}], edges: [{source, target, type, time}]}
    """
    network = build_narrative_graph(narrative_id)
    return network


@app.get("/api/v1/narratives/{narrative_id}/communities")
def get_narrative_communities(narrative_id: str):
    """
    GET /api/v1/narratives/{id}/communities
    Returns: {"communities": [{community_id, label, participant_count, dominant_sentiment, dominant_sentiment_pct, dominant_emotion, avg_engagement, platforms}]}
    """
    communities = get_community_dna(narrative_id)
    return communities


@app.get("/api/v1/narratives/{narrative_id}/mutation-journey")
def get_narrative_mutation_journey(narrative_id: str):
    """
    GET /api/v1/narratives/{id}/mutation-journey
    Returns: {narrative_id, emotion_journey: [strings], stages: [{stage, community_label, reframe, dominant_emotion, timestamp}]}
    """
    journey = get_mutation_journey(narrative_id)
    return journey


@app.get("/api/v1/trends")
def get_trends():
    """
    GET /api/v1/trends
    Returns: {trends: [{id, topic, momentum, momentum_history: [numbers], state, breakout_probability}]}
    """
    trends = get_trends_list()
    return {"trends": trends}


@app.get("/api/v1/alerts")
def get_alerts():
    """
    GET /api/v1/alerts
    Returns: {alerts: [{narrative_id, level (critical|accelerating|emerging), headline, time}]}
    """
    alerts = get_alerts_list()
    return {"alerts": alerts}


@app.post("/api/v1/ask")
def ask_question(body: AskRequest):
    """
    POST /api/v1/ask
    Request: {query: string}
    Returns: {answer: string, evidence: {narrative_id, show: [strings]}, confidence: float}
    """
    if not body.query or not body.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    result = answer_query(body.query)
    return result


@app.get("/api/v1/demographics/{narrative_id}")
def get_narrative_demographics(narrative_id: str):
    """
    GET /api/v1/demographics/{narrative_id}
    Returns: {age_brackets: {bracket: fraction}, top_language, top_region, audience_tribes: [strings]}
    """
    demographics = get_demographics(narrative_id)
    return demographics


@app.get("/api/v1/system/usage")
def get_system_usage():
    """
    STAGE 4: Cost-Control Panel
    GET /api/v1/system/usage
    Returns real running counters: Gemini calls, local model savings, estimated tokens,
    and connectivity status for Telegram and X API.
    """
    metrics = get_nlp_usage_metrics()
    tg_connected = has_live_telegram_data()
    total = metrics["total_posts_analyzed"]
    saved = metrics["gemini_calls_saved_by_local_model"]
    pct = f"{(saved / max(1, total)) * 100:.1f}%"

    return {
        "gemini_calls_real": metrics.get("gemini_calls_real", 0),
        "gemini_calls_emulated": metrics.get("gemini_calls_emulated", 0),
        "gemini_calls_today": metrics.get("gemini_calls_today", 0),
        "gemini_calls_saved_by_local_model": saved,
        "estimated_gemini_tokens_used": metrics["estimated_gemini_tokens_used"],
        "x_api_status": "not connected: pay-per-use, sample data mode",
        "telegram_status": "connected: live" if tg_connected else "ready: public channels configured",
        "total_posts_analyzed": total,
        "local_classifications_count": metrics["local_classifications_count"],
        "local_savings_percentage": pct
    }


class LiveTelegramIngestRequest(BaseModel):
    channels: Optional[List[str]] = None
    max_per_channel: int = Field(25, ge=5, le=50)


@app.post("/api/v1/ingest/telegram/live")
def ingest_live_telegram_endpoint(payload: Optional[LiveTelegramIngestRequest] = None):
    """
    STAGE 2: Real Telegram Ingestion
    POST /api/v1/ingest/telegram/live
    Connects to live public Telegram channels, pulls unseen posts,
    processes them through hybrid NLP, and clusters them into narratives dynamically.
    """
    channels = payload.channels if payload else None
    max_per_channel = payload.max_per_channel if payload else 25
    summary = ingest_live_telegram_stream(channels=channels, max_per_channel=max_per_channel)
    return summary


@app.post("/api/v1/system/reset-to-seed")
def reset_to_seed_endpoint():
    """
    POST /api/v1/system/reset-to-seed
    Safety switch for demo mode:
    Clears all live-ingested events (sample_data = 0 / live_telegram),
    purges dynamically created narrative metadata,
    and restores the database to exactly the 3 original seeded narratives:
    - narrative-policy-fee-hike
    - narrative-surge-surcharge
    - narrative-metro-ai-pilot
    With zero side effects on those 3 seeded narratives.
    """
    reset_database_to_seed()
    reset_narrative_metadata()
    load_seed_data()
    reset_nlp_metrics()
    batch_classify_and_update()
    metrics = get_nlp_usage_metrics()

    logger.info("Demo Mode Safety Switch: Successfully restored system to 3 seeded narratives.")
    return {
        "status": "success",
        "demo_mode": True,
        "message": "Database and metadata restored to exactly the 3 seeded narratives. All live data cleared.",
        "active_narratives": [
            "narrative-policy-fee-hike",
            "narrative-surge-surcharge",
            "narrative-metro-ai-pilot"
        ],
        "narratives_count": 3,
        "events_count": 32,
        "usage": metrics
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
