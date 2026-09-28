"""
Trends and Momentum Scoring module for Social Pulse AI.
Computes narrative momentum scores (0-100), momentum history, states,
breakout probabilities, and alert levels based on velocity, engagement, and community spread.
"""

from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional
import math
from db import fetch_all_narrative_ids, fetch_events_by_narrative

# Narrative topic metadata dictionary
NARRATIVE_METADATA = {
    "narrative-policy-fee-hike": {
        "topic": "Policy X National Exam 300% Fee Hike Leak",
        "core_claim": "A purported education ministry draft mandates a 300% application fee increase for national competitive exams.",
        "why_now": [
            "Telegram leak surfaced right before annual exam schedule announcement",
            "High student sensitivity around youth unemployment and test transparency",
            "Influential student union handles amplified unverified draft"
        ]
    },
    "narrative-surge-surcharge": {
        "topic": "Smart Meter Peak Hour Power Tariff Surcharge",
        "core_claim": "Social media claims smart meters will enforce 1.8x residential surge pricing between 6 PM and 10 PM.",
        "why_now": [
            "Ongoing smart meter replacements in urban residential complexes",
            "Confusion between commercial ToD tariffs and domestic rate slabs"
        ]
    },
    "narrative-metro-ai-pilot": {
        "topic": "AI Facial Recognition at Metro Transit Pilot",
        "core_claim": "Metro authority is testing frictionless biometric facial scanners at transit turnstiles.",
        "why_now": [
            "Surveillance camera installations spotted at major junction turnstiles",
            "Privacy advocacy groups questioning lack of public data impact assessments"
        ]
    }
}


def reset_narrative_metadata():
    """Purges any dynamically discovered narratives from the in-memory registry, restoring only the 3 canonical seed narratives."""
    canonical_keys = {"narrative-policy-fee-hike", "narrative-surge-surcharge", "narrative-metro-ai-pilot"}
    current_keys = list(NARRATIVE_METADATA.keys())
    for k in current_keys:
        if k not in canonical_keys:
            del NARRATIVE_METADATA[k]


def score_to_state(score: float) -> str:
    """
    Maps 0-100 momentum score to human-readable state:
    0-20 dormant, 20-40 emerging, 40-60 growing, 60-80 accelerating, 80-100 viral.
    """
    if score < 20:
        return "dormant"
    elif score < 40:
        return "emerging"
    elif score < 60:
        return "growing"
    elif score < 80:
        return "accelerating"
    else:
        return "viral"


def compute_momentum_score(events_subset: List[Dict[str, Any]]) -> float:
    """
    Computes the 0-100 momentum score for any chronological subset of events.
    Mentions growth + engagement velocity + cross-platform & community spread.
    """
    if not events_subset:
        return 0.0

    total_posts = len(events_subset)
    total_engagement = sum(ev.get("engagement_score", 0) for ev in events_subset)
    platforms = set(ev.get("platform") for ev in events_subset if ev.get("platform"))
    communities = set(ev.get("community_id") for ev in events_subset if ev.get("community_id") is not None)

    if total_engagement > 100000:
        # Mainstream viral breakout
        post_factor = min(22.0, total_posts * 1.8)
        eng_factor = 48.0
        cross_platform_bonus = len(platforms) * 7.0
        community_bonus = min(14.0, len(communities) * 4.0)
    elif total_engagement > 20000:
        # Rapidly accelerating narrative
        post_factor = min(16.0, total_posts * 1.5)
        eng_factor = 28.0
        cross_platform_bonus = len(platforms) * 5.0
        community_bonus = min(12.0, len(communities) * 3.5)
    else:
        # Early emerging signal
        post_factor = min(10.0, total_posts * 1.0)
        eng_factor = max(2.0, min(14.0, (total_engagement / 1200.0) * 8.0))
        cross_platform_bonus = len(platforms) * 3.0
        community_bonus = min(8.0, len(communities) * 2.0)

    raw_momentum = post_factor + eng_factor + cross_platform_bonus + community_bonus
    return min(98.5, max(5.0, round(raw_momentum, 1)))


def calculate_narrative_momentum(narrative_id: str) -> Dict[str, Any]:
    """
    Calculates detailed momentum metrics, breakout probability, and historical score trend.
    """
    events = fetch_events_by_narrative(narrative_id)
    meta = NARRATIVE_METADATA.get(narrative_id, {
        "topic": narrative_id.replace("-", " ").title(),
        "core_claim": "Social media discussion around " + narrative_id,
        "why_now": ["Recent surge in user interest and discussions"]
    })
    
    if not events:
        return {
            "id": narrative_id,
            "topic": meta["topic"],
            "momentum": 0,
            "momentum_history": [0, 0, 0, 0, 0],
            "state": "dormant",
            "breakout_probability": 0.0,
            "alert_level": "emerging",
            "sentiment": "neutral",
            "sentiment_delta": "+0.00",
            "spread_path": [],
            "first_seen": datetime.now(timezone.utc).isoformat(),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

    # Extract platforms & communities
    platforms = []
    for ev in events:
        p = ev.get("platform")
        if p and p not in platforms:
            platforms.append(p)
            
    total_posts = len(events)
    
    # Time delta
    timestamps = [ev["timestamp"] for ev in events if ev.get("timestamp")]
    timestamps.sort()
    first_seen = timestamps[0] if timestamps else datetime.now(timezone.utc).isoformat()
    last_updated = timestamps[-1] if timestamps else datetime.now(timezone.utc).isoformat()

    # Calculate current overall momentum score
    momentum = compute_momentum_score(events)
    state = score_to_state(momentum)
    
    # Recalculate real historical momentum across 5 chronological checkpoints
    events_sorted = sorted(events, key=lambda x: x["timestamp"])
    total_cnt = len(events_sorted)
    num_points = 5
    momentum_history = []
    for i in range(1, num_points):
        # Progressively slice chronological events up to checkpoint i
        idx = max(1, int(round((i / num_points) * total_cnt)))
        sub_events = events_sorted[:idx]
        hist_score = compute_momentum_score(sub_events)
        momentum_history.append(hist_score)
    # The final point in history is the current full momentum score
    momentum_history.append(momentum)

    # Breakout probability (0.0 - 1.0)
    neg_emotions = sum(1 for ev in events if ev.get("emotion") in ["mobilization", "anger", "fear", "opposition"])
    neg_ratio = neg_emotions / max(1, total_posts)
    breakout_prob = min(0.98, max(0.05, round((momentum / 100.0) * 0.70 + (neg_ratio * 0.30), 2)))

    # Alert level
    if momentum >= 70 or breakout_prob >= 0.75:
        alert_level = "critical"
    elif momentum >= 40:
        alert_level = "accelerating"
    else:
        alert_level = "emerging"

    # Sentiment distribution & delta
    sentiments = [ev.get("sentiment") for ev in events if ev.get("sentiment")]
    pos = sentiments.count("positive")
    neg = sentiments.count("negative")
    neu = sentiments.count("neutral")
    
    if neg > pos and neg > neu:
        overall_sentiment = "negative"
    elif pos > neg and pos > neu:
        overall_sentiment = "positive"
    else:
        overall_sentiment = "neutral"

    sentiment_delta = f"+{round((neg / max(1, total_posts)) * 0.22, 2):.2f}" if overall_sentiment == "negative" else "-0.08"

    # Check if narrative is sample X data or real live data
    is_sample = any(ev.get("platform") in ["x", "twitter"] or ev.get("sample_data", True) for ev in events) if events else True
    data_source = "sample_x_curated" if is_sample else "live_telegram"

    return {
        "id": narrative_id,
        "topic": meta["topic"],
        "momentum": momentum,
        "momentum_history": momentum_history,
        "state": state,
        "breakout_probability": breakout_prob,
        "alert_level": alert_level,
        "sentiment": overall_sentiment,
        "sentiment_delta": sentiment_delta,
        "spread_path": platforms,
        "first_seen": first_seen,
        "last_updated": last_updated,
        "sample_data": is_sample,
        "data_source": data_source
    }


def get_all_narratives_overview() -> List[Dict[str, Any]]:
    """Returns the list of all narratives with momentum summary matching API contract."""
    narrative_ids = fetch_all_narrative_ids()
    results = []
    for nid in narrative_ids:
        results.append(calculate_narrative_momentum(nid))
    # Sort by momentum descending
    results.sort(key=lambda x: x["momentum"], reverse=True)
    return results


def get_trends_list() -> List[Dict[str, Any]]:
    """Returns the trends list formatted according to GET /api/v1/trends."""
    narratives = get_all_narratives_overview()
    trends = []
    for n in narratives:
        trends.append({
            "id": n["id"],
            "topic": n["topic"],
            "momentum": n["momentum"],
            "momentum_history": n["momentum_history"],
            "state": n["state"],
            "breakout_probability": n["breakout_probability"],
            "sample_data": n.get("sample_data", True),
            "data_source": n.get("data_source", "sample_x_curated")
        })
    return trends


def detect_early_signal(narrative_id: str) -> Optional[Dict[str, Any]]:
    """
    STAGE 1: Early Signal Detector.
    Detects abnormal early narrative growth before general momentum escalation.
    
    A narrative qualifies as an 'early signal' if:
    1. It is still in 'dormant' or 'emerging' momentum_state.
    2. Its short-window early growth rate exceeds a threshold (e.g. mention/engagement growth >= 100%
       between earliest checkpoints).
    3. It has started moving across more than one community or platform.
    
    Returns:
    {
        "mention_growth_pct": int,
        "new_communities": int,
        "cross_platform_movement": str,
        "status": "WATCH"
    } or None if not qualified.
    """
    events = fetch_events_by_narrative(narrative_id)
    if not events or len(events) < 2:
        return None

    trend = calculate_narrative_momentum(narrative_id)
    state = trend.get("state", "dormant")
    if state not in ["dormant", "emerging"]:
        return None

    events_sorted = sorted(events, key=lambda x: x["timestamp"])
    total_cnt = len(events_sorted)

    idx_1 = max(1, int(round((1 / 5) * total_cnt)))
    idx_2 = max(idx_1 + 1, int(round((2 / 5) * total_cnt)))

    sub_1 = events_sorted[:idx_1]
    sub_2 = events_sorted[:idx_2]

    # Growth rate between earliest checkpoints
    c1_mentions = len(sub_1)
    c2_new_mentions = len(sub_2) - c1_mentions
    mention_growth = (c2_new_mentions / max(1, c1_mentions)) * 100.0

    c1_eng = sum(e.get("engagement_score", 0) for e in sub_1)
    c2_new_eng = sum(e.get("engagement_score", 0) for e in sub_2[idx_1:idx_2])
    eng_growth = (c2_new_eng / max(1, c1_eng)) * 100.0

    growth_rate = max(mention_growth, eng_growth)
    if growth_rate < 100.0:
        return None

    comms_early = set(e.get("community_id") for e in sub_1 if e.get("community_id") is not None)
    comms_now = set(e.get("community_id") for e in events_sorted if e.get("community_id") is not None)

    platforms_chronological = []
    for ev in events_sorted:
        p = ev.get("platform")
        if p and p not in platforms_chronological:
            platforms_chronological.append(p)

    if len(comms_now) <= 1 and len(platforms_chronological) <= 1:
        return None

    if len(platforms_chronological) > 1:
        cross_platform_movement = f"{platforms_chronological[0]} -> {platforms_chronological[1]}"
    else:
        cross_platform_movement = f"{platforms_chronological[0]} (intra-platform)"

    return {
        "mention_growth_pct": int(round(growth_rate)),
        "new_communities": len(comms_now),
        "cross_platform_movement": cross_platform_movement,
        "status": "WATCH"
    }


def compute_social_temperature(narrative_id: str) -> Tuple[float, str]:
    """
    STAGE 3: Social Temperature (single combined dial).
    Combines current momentum score, overall negative-sentiment percentage,
    engagement velocity, and number of distinct communities/platforms involved.
    Weights these into a single 0-100 value and maps to four bands:
    0-25 calm, 25-50 warming, 50-75 heated, 75-100 critical.
    
    Returns: (temperature_score: float, temperature_state: str)
    """
    events = fetch_events_by_narrative(narrative_id)
    if not events:
        return 0.0, "calm"

    trend = calculate_narrative_momentum(narrative_id)
    momentum = trend["momentum"]

    total_posts = len(events)
    neg_posts = sum(1 for e in events if e.get("sentiment") == "negative")
    neg_pct = (neg_posts / max(1, total_posts)) * 100.0

    total_eng = sum(e.get("engagement_score", 0) for e in events)
    eng_norm = min(100.0, (total_eng / 120000.0) * 100.0)

    plats = set(e.get("platform") for e in events if e.get("platform"))
    comms = set(e.get("community_id") for e in events if e.get("community_id") is not None)
    spread = min(100.0, (len(plats) * 25.0) + (len(comms) * 16.0))

    # Weighted combination: 40% momentum, 30% negative sentiment, 15% engagement, 15% spread
    score = (momentum * 0.40) + (neg_pct * 0.30) + (eng_norm * 0.15) + (spread * 0.15)
    score = round(min(100.0, max(0.0, score)), 1)

    if score >= 75:
        band = "critical"
    elif score >= 50:
        band = "heated"
    elif score >= 25:
        band = "warming"
    else:
        band = "calm"

    return score, band


def get_alerts_list() -> List[Dict[str, Any]]:
    """Returns alerts formatted according to GET /api/v1/alerts."""
    narratives = get_all_narratives_overview()
    alerts = []
    for n in narratives:
        headline = f"High velocity spread detected for '{n['topic']}' across {', '.join(n['spread_path'])}."
        if n["alert_level"] == "critical":
            headline = f"CRITICAL BREAKOUT: '{n['topic']}' cross-platform viral surge ({n['state'].upper()})."
        elif n["alert_level"] == "accelerating":
            headline = f"ACCELERATING: Rapid community mobilization around '{n['topic']}'."
        
        alert_item = {
            "narrative_id": n["id"],
            "level": n["alert_level"],
            "headline": headline,
            "time": n["last_updated"],
            "sample_data": n.get("sample_data", True),
            "data_source": n.get("data_source", "sample_x_curated")
        }
        
        # Optional early_signal block if qualified (omit key otherwise)
        early_sig = detect_early_signal(n["id"])
        if early_sig is not None:
            alert_item["early_signal"] = early_sig

        alerts.append(alert_item)
    return alerts
