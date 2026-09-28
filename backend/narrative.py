"""
Narrative DNA and Timeline Assembly module for Social Pulse AI.
Assembles complete Narrative DNA objects, mutation logs, timeline event progressions,
sentiment/emotion series over time, and aggregate demographic profiles matching the API contract.
"""

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from db import fetch_events_by_narrative
from trends import calculate_narrative_momentum, NARRATIVE_METADATA, compute_social_temperature
from graph import build_narrative_graph
from nlp import VALID_EMOTIONS

# Rich mutation narratives by narrative ID
MUTATION_PROFILES = {
    "narrative-policy-fee-hike": [
        {
            "community": "Community 0: Telegram Aspirant Channels",
            "reframe": "Alarmist leak claiming 300% fee hike will price poor students out of testing."
        },
        {
            "community": "Community 1: Twitter Youth & EdTech Sphere",
            "reframe": "Framed as systemic commercialization of public education and direct taxation on merit."
        },
        {
            "community": "Community 2: Institutional & Fact Checkers",
            "reframe": "Reframed as outdated unapproved 2024 committee working paper; existing fees remain unchanged."
        }
    ],
    "narrative-surge-surcharge": [
        {
            "community": "Community 0: Resident Welfare Telegram Groups",
            "reframe": "Warning that domestic smart meters will automatically double electricity rates during dinner hours."
        },
        {
            "community": "Community 1: Consumer Rights Handles",
            "reframe": "Framed as stealth utility price gouging without legislative or regulatory public hearings."
        },
        {
            "community": "Community 2: Power Regulatory Board",
            "reframe": "Clarification that Time-of-Day surge pricing is strictly for heavy commercial/industrial slabs."
        }
    ],
    "narrative-metro-ai-pilot": [
        {
            "community": "Community 0: Daily Commuters Community",
            "reframe": "Observation of newly installed biometric face-scanning camera hardware at station gates."
        },
        {
            "community": "Community 1: Digital Rights & Privacy Advocates",
            "reframe": "Surveillance overreach and warrantless facial recognition without privacy safeguards."
        },
        {
            "community": "Community 2: Transit Authority & Civic Watch",
            "reframe": "Pilot operations clarify opt-in status and data privacy protections."
        }
    ]
}

# Aggregate demographic profiles
DEMOGRAPHIC_PROFILES = {
    "narrative-policy-fee-hike": {
        "age_brackets": {
            "18-24": 0.62,
            "25-34": 0.26,
            "35-44": 0.08,
            "45+": 0.04
        },
        "top_language": "English / Hindi (Hinglish)",
        "top_region": "North & Central Education Hubs (Delhi, UP, Bihar, Rajasthan)",
        "audience_tribes": [
            "Competitive Exam Aspirants",
            "Student Union Activists",
            "EdTech Influencers",
            "Civil Governance Watchers"
        ]
    },
    "narrative-surge-surcharge": {
        "age_brackets": {
            "18-24": 0.12,
            "25-34": 0.38,
            "35-44": 0.32,
            "45+": 0.18
        },
        "top_language": "English / Hindi",
        "top_region": "Urban Metros (Tier 1 & Tier 2 Residential Belts)",
        "audience_tribes": [
            "Homeowners & RWA Members",
            "Consumer Rights Advocates",
            "Urban Policy Analysts",
            "Green Grid Tech Observers"
        ]
    },
    "narrative-metro-ai-pilot": {
        "age_brackets": {
            "18-24": 0.34,
            "25-34": 0.48,
            "35-44": 0.14,
            "45+": 0.04
        },
        "top_language": "English",
        "top_region": "Metropolitan Commuter Corridors",
        "audience_tribes": [
            "Daily Metro Commuters",
            "Digital Privacy Advocates",
            "Smart Cities Tech Enthusiasts",
            "Urban Infrastructure Columnists"
        ]
    }
}


def get_narratives_overview_list() -> List[Dict[str, Any]]:
    """
    Returns list of narratives formatted for GET /api/v1/narratives:
    [{id, topic, momentum, momentum_state, breakout_probability, sentiment, sentiment_delta, spread_path, first_seen, last_updated, alert_level, social_temperature, social_temperature_state}]
    """
    from trends import get_all_narratives_overview
    raw_list = get_all_narratives_overview()
    formatted = []
    for item in raw_list:
        temp_score, temp_state = compute_social_temperature(item["id"])
        formatted.append({
            "id": item["id"],
            "topic": item["topic"],
            "momentum": item["momentum"],
            "momentum_state": item["state"],  # mapped to momentum_state in API contract
            "breakout_probability": item["breakout_probability"],
            "sentiment": item["sentiment"],
            "sentiment_delta": item["sentiment_delta"],
            "spread_path": item["spread_path"],
            "first_seen": item["first_seen"],
            "last_updated": item["last_updated"],
            "alert_level": item["alert_level"],
            "social_temperature": temp_score,
            "social_temperature_state": temp_state,
            "sample_data": item.get("sample_data", True),
            "data_source": item.get("data_source", "sample_x_curated")
        })
    return formatted


def get_narrative_dna(narrative_id: str) -> Dict[str, Any]:
    """
    Returns the Narrative DNA object formatted for GET /api/v1/narratives/{id}:
    {id, topic, core_claim, origin: {platform, community, timestamp}, mutation: [{community, reframe}], why_now: [strings], confidence, forecast: {expected_reach, communities_affected, expected_duration_hours, breakout_probability}}
    """
    events = fetch_events_by_narrative(narrative_id)
    trend = calculate_narrative_momentum(narrative_id)
    meta = NARRATIVE_METADATA.get(narrative_id, {
        "topic": narrative_id.replace("-", " ").title(),
        "core_claim": "Discussion circulating on social platforms regarding " + narrative_id,
        "why_now": ["Recent amplification across online channels"]
    })

    # Earliest event for origin
    if events:
        events_sorted = sorted(events, key=lambda x: x["timestamp"])
        earliest = events_sorted[0]
        origin = {
            "platform": earliest["platform"],
            "community": f"Community {earliest.get('community_id', 0)} ({earliest['author_name']})",
            "timestamp": earliest["timestamp"]
        }
    else:
        origin = {
            "platform": "telegram",
            "community": "Community 0",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    # Mutations
    mutations = MUTATION_PROFILES.get(narrative_id, [
        {"community": "Community 0", "reframe": "Initial reporting and reactions"},
        {"community": "Community 1", "reframe": "Broad public and cross-platform debate"}
    ])

    # Forecast calculation based on momentum
    m = trend["momentum"]
    expected_reach = int(m * 12500 + 15000)
    distinct_communities = len(set(ev.get("community_id") for ev in events if ev.get("community_id") is not None)) or 2
    duration_hours = max(12, int(m * 0.75 + 18))

    temp_score, temp_state = compute_social_temperature(narrative_id)

    return {
        "id": narrative_id,
        "topic": meta["topic"],
        "core_claim": meta["core_claim"],
        "origin": origin,
        "mutation": mutations,
        "why_now": meta["why_now"],
        "confidence": 0.92 if len(events) >= 5 else 0.78,
        "forecast": {
            "expected_reach": expected_reach,
            "communities_affected": max(2, distinct_communities),
            "expected_duration_hours": duration_hours,
            "breakout_probability": trend["breakout_probability"]
        },
        "social_temperature": temp_score,
        "social_temperature_state": temp_state,
        "sample_data": trend.get("sample_data", True),
        "data_source": trend.get("data_source", "sample_x_curated")
    }


def get_narrative_timeline(narrative_id: str) -> Dict[str, Any]:
    """
    Returns timeline events and emotion sentiment progression for GET /api/v1/narratives/{id}/timeline:
    {events: [{time, type, actor, sentiment}], sentiment_series: [{time, <emotion>: 0-1, ...}]}
    """
    events = fetch_events_by_narrative(narrative_id)
    if not events:
        now_iso = datetime.now(timezone.utc).isoformat()
        return {
            "events": [],
            "sentiment_series": [
                {"time": now_iso, **{em: (0.11 if em == "curiosity" else 0.0) for em in VALID_EMOTIONS}}
            ]
        }

    events_sorted = sorted(events, key=lambda x: x["timestamp"])

    # 1. Timeline events
    timeline_events = []
    for ev in events_sorted:
        timeline_events.append({
            "time": ev["timestamp"],
            "type": ev.get("interaction_type", "post"),
            "actor": ev.get("author_name") or ev.get("author_id"),
            "sentiment": ev.get("sentiment", "neutral")
        })

    # 2. Sentiment / Emotion series over time
    # Construct normalized probability distributions for each chronological step
    sentiment_series = []
    
    # Running count of emotions to show evolution over time
    running_emotions = {em: 0.05 for em in VALID_EMOTIONS}
    
    for ev in events_sorted:
        ev_emotion = ev.get("emotion", "curiosity")
        if ev_emotion in running_emotions:
            running_emotions[ev_emotion] += 1.0
        else:
            running_emotions["curiosity"] += 1.0

        total_weights = sum(running_emotions.values())
        
        step_entry: Dict[str, Any] = {"time": ev["timestamp"]}
        for em in VALID_EMOTIONS:
            step_entry[em] = round(running_emotions[em] / total_weights, 3)

        sentiment_series.append(step_entry)

    return {
        "events": timeline_events,
        "sentiment_series": sentiment_series
    }


def get_demographics(narrative_id: str) -> Dict[str, Any]:
    """
    Returns aggregate demographics for GET /api/v1/demographics/{narrative_id}:
    {age_brackets: {bracket: fraction}, top_language, top_region, audience_tribes: [strings]}
    """
    return DEMOGRAPHIC_PROFILES.get(narrative_id, {
        "age_brackets": {
            "18-24": 0.45,
            "25-34": 0.35,
            "35-44": 0.15,
            "45+": 0.05
        },
        "top_language": "English / Hindi",
        "top_region": "National / Multi-Region",
        "audience_tribes": ["General Social Media Users", "Domain Observers", "Civic Community"]
    })


def get_community_dna(narrative_id: str) -> Dict[str, Any]:
    """
    Groups events for a narrative by community_id and computes per community:
    dominant sentiment (with percentage), dominant emotion, participant count,
    average engagement score, and top 2-3 platforms represented.
    Returns: {"communities": [{community_id, label, participant_count, dominant_sentiment, dominant_sentiment_pct, dominant_emotion, avg_engagement, platforms}]}
    """
    from collections import Counter
    events = fetch_events_by_narrative(narrative_id)
    if not events:
        return {"communities": []}

    # Group events by community_id
    community_events: Dict[int, List[Dict[str, Any]]] = {}
    for ev in events:
        c_id = ev.get("community_id") if ev.get("community_id") is not None else 0
        community_events.setdefault(int(c_id), []).append(ev)

    # Max engagement across all narrative events for normalized ratio
    max_narrative_eng = max((ev.get("engagement_score", 0) for ev in events), default=1) or 1

    # Extract human-readable community labels from MUTATION_PROFILES if available
    mutations = MUTATION_PROFILES.get(narrative_id, [])
    label_map: Dict[int, str] = {}
    for m in mutations:
        c_str = m.get("community", "")
        # Format usually: "Community 0: Telegram Aspirant Channels"
        if ":" in c_str:
            prefix, label_text = c_str.split(":", 1)
            parts = prefix.strip().split()
            if len(parts) >= 2 and parts[1].isdigit():
                label_map[int(parts[1])] = label_text.strip()

    communities_list = []
    for c_id in sorted(community_events.keys()):
        c_evs = community_events[c_id]
        
        # Participant count: unique authors
        unique_authors = set(ev["author_id"] for ev in c_evs if ev.get("author_id"))
        participant_count = len(unique_authors) or len(c_evs)

        # Dominant sentiment & percentage
        sentiments = [ev.get("sentiment") for ev in c_evs if ev.get("sentiment")]
        if sentiments:
            sent_counts = Counter(sentiments)
            dom_sent, dom_sent_count = sent_counts.most_common(1)[0]
            dom_sent_pct = round(dom_sent_count / len(sentiments), 2)
        else:
            dom_sent = "neutral"
            dom_sent_pct = 1.0

        # Dominant emotion
        emotions = [ev.get("emotion") for ev in c_evs if ev.get("emotion")]
        if emotions:
            dom_emotion = Counter(emotions).most_common(1)[0][0]
        else:
            dom_emotion = "curiosity"

        # Average engagement score (normalized to 0-1 range)
        mean_eng = sum(ev.get("engagement_score", 0) for ev in c_evs) / len(c_evs)
        avg_engagement = round(min(1.0, max(0.05, mean_eng / max_narrative_eng)), 2)

        # Platforms represented (top 2-3 by occurrence)
        platform_counts = Counter(ev.get("platform", "web") for ev in c_evs)
        platforms = [p for p, _ in platform_counts.most_common(3)]

        # Human-readable label
        if c_id in label_map:
            label = label_map[c_id]
        else:
            # Fallback derivation from top platform and sample author
            top_p = platforms[0].title() if platforms else "Community"
            first_author = c_evs[0].get("author_name") or f"Actor {c_id}"
            label = f"{top_p} Cluster {c_id} ({first_author})"

        communities_list.append({
            "community_id": c_id,
            "label": label,
            "participant_count": participant_count,
            "dominant_sentiment": dom_sent,
            "dominant_sentiment_pct": dom_sent_pct,
            "dominant_emotion": dom_emotion,
            "avg_engagement": avg_engagement,
            "platforms": platforms
        })

    return {"communities": communities_list}


def get_mutation_journey(narrative_id: str) -> Dict[str, Any]:
    """
    STAGE 2: Narrative Mutation Tracker (staged emotion journey view).
    Produces an ordered list of stages, each combining a community's reframe with
    its dominant emotion and the approximate time that community became active in the narrative
    (using earliest event timestamp within that community).
    
    Returns:
    {
        "narrative_id": narrative_id,
        "emotion_journey": [dominant_emotion_1, ...],
        "stages": [
            {
                "stage": 1,
                "community_label": "...",
                "reframe": "...",
                "dominant_emotion": "...",
                "timestamp": "..."
            }
        ]
    }
    """
    from collections import Counter
    events = fetch_events_by_narrative(narrative_id)
    mutations = MUTATION_PROFILES.get(narrative_id, [])

    # Map labels and reframes from MUTATION_PROFILES
    label_map = {}
    reframe_map = {}
    for idx, m in enumerate(mutations):
        comm_str = m.get("community", "")
        reframe = m.get("reframe", "")
        if ":" in comm_str:
            parts = comm_str.split(":", 1)
            c_prefix = parts[0].strip().lower()
            label_text = parts[1].strip()
            if c_prefix.startswith("community"):
                c_num_str = c_prefix.replace("community", "").strip()
                if c_num_str.isdigit():
                    c_id = int(c_num_str)
                    label_map[c_id] = label_text
                    reframe_map[c_id] = reframe
        else:
            reframe_map[idx] = reframe
            label_map[idx] = comm_str

    if not events:
        return {
            "narrative_id": narrative_id,
            "emotion_journey": [],
            "stages": []
        }

    # Group events by community_id
    community_events: Dict[int, List[Dict[str, Any]]] = {}
    for ev in events:
        cid = ev.get("community_id", 0)
        community_events.setdefault(cid, []).append(ev)

    raw_stages = []
    for cid, c_evs in community_events.items():
        # Earliest event timestamp in this community = community activation time
        timestamps = [ev["timestamp"] for ev in c_evs if ev.get("timestamp")]
        earliest_ts = min(timestamps) if timestamps else datetime.now(timezone.utc).isoformat()

        # Dominant emotion in this community
        emotions = [ev.get("emotion") for ev in c_evs if ev.get("emotion")]
        if emotions:
            dom_emotion = Counter(emotions).most_common(1)[0][0]
        else:
            dom_emotion = "curiosity"

        # Label and reframe
        if cid in label_map:
            community_label = label_map[cid]
        else:
            top_p = (c_evs[0].get("platform") or "Web").title()
            first_author = c_evs[0].get("author_name") or f"Actor {cid}"
            community_label = f"{top_p} Cluster {cid} ({first_author})"

        reframe = reframe_map.get(cid, "Community discourse and amplification.")

        raw_stages.append({
            "community_label": community_label,
            "reframe": reframe,
            "dominant_emotion": dom_emotion,
            "timestamp": earliest_ts
        })

    # Order chronologically by when each community became active
    raw_stages.sort(key=lambda s: s["timestamp"])

    stages = []
    for idx, s in enumerate(raw_stages):
        stages.append({
            "stage": idx + 1,
            "community_label": s["community_label"],
            "reframe": s["reframe"],
            "dominant_emotion": s["dominant_emotion"],
            "timestamp": s["timestamp"]
        })

    emotion_journey = [s["dominant_emotion"] for s in stages]

    return {
        "narrative_id": narrative_id,
        "emotion_journey": emotion_journey,
        "stages": stages
    }


def assign_narrative(
    event: Dict[str, Any],
    similarity_threshold: float = 0.20,
    time_window_hours: float = 24.0
) -> Tuple[str, str, bool]:
    """
    HEURISTIC NARRATIVE CLUSTERING (Hackathon-grade proof of concept):
    Assigns an unseen incoming social event to an existing narrative cluster or creates a new one.
    
    Approach:
    1. Thread lineage: If parent_id references an existing post, inherits parent's narrative_id.
    2. Feature overlap: Computes token overlap across topics, named entities, and key terms
       against each active narrative cluster.
    3. Time proximity: Grants a proximity boost if the event occurred within `time_window_hours`
       of the narrative's latest activity.
    
    If the combined similarity score exceeds `similarity_threshold`, the event is assigned
    to the highest-matching existing narrative.
    Otherwise, a new narrative cluster is initialized.
    
    NOTE: This is a lightweight heuristic suitable for SIH hackathon demos and fast prototyping,
    not a trained vector embedding/clustering pipeline.
    
    Returns: (narrative_id: str, topic_title: str, is_new_narrative: bool)
    """
    import re
    import uuid
    from db import fetch_all_narrative_ids, fetch_events_by_narrative

    # 1. Thread lineage check
    parent_id = event.get("parent_id")
    if parent_id:
        from db import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT narrative_id FROM events WHERE id = ?", (parent_id,))
        row = cursor.fetchone()
        conn.close()
        if row and row["narrative_id"]:
            parent_nid = row["narrative_id"]
            topic = NARRATIVE_METADATA.get(parent_nid, {}).get("topic", parent_nid)
            return parent_nid, topic, False

    # 2. Extract event tokens and apply boilerplate filtering
    boilerplate_tokens = {
        "telegram", "durov", "worldnews", "tginfoen", "tginfo",
        "@worldnews", "@tginfo", "@durov", "@telegram", "@tginfoen",
        "channel", "read", "full", "article", "subscribe", "update", "updates"
    }

    event_topics = [
        str(t).lower() for t in event.get("topics", [])
        if str(t).lower() != "social media discussion" and str(t).lower() not in boilerplate_tokens
    ]
    event_entities = [
        str(e).lower() for e in event.get("entities", [])
        if str(e).lower() not in boilerplate_tokens
    ]
    raw_content = event.get("content", "").lower()
    content_words = set(re.findall(r"\b[a-zA-Z]{3,}\b", raw_content))
    # Exclude common stop words, generic numbers/time words, and channel boilerplate tokens
    stop_words = {
        "the", "and", "for", "that", "this", "with", "have", "from", "are", "was", "will",
        "our", "all", "after", "years", "out", "over", "what", "just", "about", "million",
        "billion", "more", "some", "they", "been", "there", "when", "here", "their", "into",
        "telegram", "durov", "worldnews", "tginfoen", "tginfo", "channel", "read", "full", "article",
        "subscribe", "post", "posts", "update", "updates"
    }
    content_words = content_words - stop_words

    event_features = set(event_topics) | set(event_entities) | content_words
    if not event_features:
        event_features = {"unclassified"}

    # Event timestamp
    try:
        ev_ts_str = event.get("timestamp") or datetime.now(timezone.utc).isoformat()
        ev_dt = datetime.fromisoformat(ev_ts_str.replace("Z", "+00:00"))
    except Exception:
        ev_dt = datetime.now(timezone.utc)

    # 3. Compare against each existing narrative
    all_narrative_ids = fetch_all_narrative_ids()
    best_nid = None
    best_score = 0.0

    for nid in all_narrative_ids:
        n_events = fetch_events_by_narrative(nid)
        if not n_events:
            continue

        # Aggregate narrative feature bag & find most recent event timestamp
        n_topics = set()
        n_entities = set()
        n_words = set()
        latest_ts = n_events[0]["timestamp"]

        for nev in n_events:
            if nev.get("timestamp") and nev["timestamp"] > latest_ts:
                latest_ts = nev["timestamp"]
            for t in nev.get("topics", []):
                t_lower = str(t).lower()
                if t_lower != "social media discussion" and t_lower not in boilerplate_tokens:
                    n_topics.add(t_lower)
            for e in nev.get("entities", []):
                e_lower = str(e).lower()
                if e_lower not in boilerplate_tokens:
                    n_entities.add(e_lower)
            words = set(re.findall(r"\b[a-zA-Z]{3,}\b", nev.get("content", "").lower()))
            n_words.update(words - stop_words)

        # MAXIMUM TIME GAP RULE:
        # An incoming event can only join an existing narrative if its timestamp
        # is within 72 hours of that narrative's most recent event.
        # Beyond 72 hours, it must start a new narrative even if lexical similarity is above threshold.
        try:
            n_dt = datetime.fromisoformat(latest_ts.replace("Z", "+00:00"))
            hours_diff = abs((ev_dt - n_dt).total_seconds() / 3600.0)
        except Exception:
            hours_diff = 0.0

        if hours_diff > 72.0:
            continue

        # Include narrative topic metadata in bag
        meta_topic = NARRATIVE_METADATA.get(nid, {}).get("topic", "").lower()
        meta_words = set(re.findall(r"\b[a-zA-Z]{3,}\b", meta_topic)) - stop_words
        n_features = n_topics | n_entities | n_words | meta_words

        # Compute topical and entity match boosts
        topic_match = len(set(event_topics) & n_topics) > 0
        entity_match = len(set(event_entities) & n_entities) > 0

        # Lexical feature overlap (Jaccard-like)
        intersection = len(event_features & n_features)
        overlap_score = intersection / max(1, len(event_features))

        # Time proximity boost (within time_window_hours = 24.0)
        time_boost = 0.0
        if topic_match or entity_match or overlap_score >= 0.20:
            if hours_diff <= time_window_hours:
                time_boost = 0.10

        combined_score = overlap_score + (0.35 if topic_match else 0.0) + (0.20 if entity_match else 0.0) + time_boost

        if combined_score > best_score:
            best_score = combined_score
            best_nid = nid

    # 4. Check threshold match (threshold = 0.30)
    if best_nid and best_score >= 0.30:
        matched_topic = NARRATIVE_METADATA.get(best_nid, {}).get("topic", best_nid)
        return best_nid, matched_topic, False

    # 5. Create new narrative cluster
    first_topic = event.get("topics", ["Emerging Story"])[0] if event.get("topics") else "Emerging Story"
    clean_slug = re.sub(r"[^a-zA-Z0-9]+", "-", first_topic.lower()).strip("-")[:18] or "topic"
    new_narrative_id = f"narrative-{clean_slug}-{uuid.uuid4().hex[:6]}"
    
    topic_clean = first_topic.strip()
    if topic_clean.lower().endswith("discussion"):
        new_topic_name = topic_clean
    else:
        new_topic_name = f"{topic_clean} Discussion"

    # Register in metadata registry
    NARRATIVE_METADATA[new_narrative_id] = {
        "topic": new_topic_name,
        "core_claim": event.get("content", "")[:140],
        "why_now": ["New community signal detected via ingestion stream"]
    }

    return new_narrative_id, new_topic_name, True


