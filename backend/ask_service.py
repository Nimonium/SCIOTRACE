"""
Natural Language Q&A / Ask Service module for Social Pulse AI.
Interprets user questions about social media narratives, correlates structured intelligence facts,
uses Gemini LLM (with robust heuristic fallback) to generate plain-English answers with supporting evidence cues.
"""

import os
import json
import logging
from typing import Dict, Any, List
from db import fetch_all_narrative_ids, fetch_events_by_narrative
from trends import calculate_narrative_momentum, NARRATIVE_METADATA
from graph import build_narrative_graph
from narrative import get_narrative_dna, get_narrative_timeline, get_demographics
from nlp import _get_gemini_client

logger = logging.getLogger(__name__)


def detect_target_narrative(query: str) -> str:
    """Matches the query to the most relevant narrative ID."""
    q = query.lower()
    if any(k in q for k in ["fee", "exam", "hike", "student", "draft", "nta", "education", "application", "aspirant"]):
        return "narrative-policy-fee-hike"
    elif any(k in q for k in ["meter", "power", "tariff", "electricity", "surge", "tod", "discom", "bill"]):
        return "narrative-surge-surcharge"
    elif any(k in q for k in ["metro", "facial", "biometric", "privacy", "camera", "turnstile", "transit", "surveillance"]):
        return "narrative-metro-ai-pilot"
    
    # Default to primary narrative
    return "narrative-policy-fee-hike"


def detect_evidence_screens(query: str, narrative_id: str) -> List[str]:
    """Determines which frontend screens/charts provide evidence for the query."""
    q = query.lower()
    screens = []
    
    if any(w in q for w in ["who", "author", "influencer", "spread", "bot", "bridge", "originator", "account", "network", "community"]):
        screens.append("network")
    if any(w in q for w in ["when", "time", "timeline", "progression", "evolve", "sentiment", "emotion", "chronolog"]):
        screens.append("timeline")
    if any(w in q for w in ["why", "cause", "claim", "mutation", "reframe", "dna", "origin", "leak"]):
        screens.append("dna")
    if any(w in q for w in ["forecast", "future", "reach", "viral", "breakout", "risk", "predict"]):
        screens.append("forecast")
    if any(w in q for w in ["demographic", "audience", "region", "age", "language"]):
        screens.append("demographics")
        
    if not screens:
        screens = ["timeline", "network"]
        
    return screens


def _synthesize_answer_rule_based(query: str, narrative_id: str, context: Dict[str, Any]) -> str:
    """High-quality rule-based plain-English answer fallback."""
    dna = context["dna"]
    graph = context["graph"]
    trend = context["trend"]
    q = query.lower()

    origin_str = f"{dna['origin']['platform'].upper()} by {dna['origin']['community']} at {dna['origin']['timestamp'][:16].replace('T', ' ')}"
    
    # Find key actors in graph
    originators = [n['id'] for n in graph['nodes'] if n['role'] == 'originator']
    bridges = [n['id'] for n in graph['nodes'] if n['role'] == 'bridge']
    authorities = [n['id'] for n in graph['nodes'] if n['role'] == 'authority']
    amplifiers = [n['id'] for n in graph['nodes'] if n['role'] == 'amplifier']

    m_state = trend.get("momentum_state") or trend.get("state") or "growing"
    
    if any(w in q for w in ["who", "started", "origin", "source"]):
        return (
            f"The narrative '{dna['topic']}' originated on {origin_str}. "
            f"Key originator was {', '.join(originators) or 'anonymous leak channel'}. "
            f"The key bridge actor who brought this across platforms was {', '.join(bridges) or 'EduWatchdog'}, "
            f"which was subsequently amplified by {', '.join(amplifiers[:2]) or 'student networks'}."
        )
    elif any(w in q for w in ["why", "cause", "trigger", "reason", "accelerat"]):
        why_list = " ".join(f"({i+1}) {r}." for i, r in enumerate(dna['why_now']))
        return (
            f"The rapid escalation of '{dna['topic']}' is driven by several key factors: {why_list} "
            f"The core claim alleges: \"{dna['core_claim']}\", creating high emotional mobilization ({m_state} momentum score: {trend['momentum']}/100)."
        )
    elif any(w in q for w in ["forecast", "viral", "future", "reach", "risk", "breakout"]):
        return (
            f"Current forecast indicates a {int(trend['breakout_probability'] * 100)}% breakout probability with '{m_state}' momentum. "
            f"Expected reach is projected at {dna['forecast']['expected_reach']:,} users across {dna['forecast']['communities_affected']} communities, "
            f"with an active cycle duration of approximately {dna['forecast']['expected_duration_hours']} hours unless official clarification gains higher reach."
        )
    else:
        return (
            f"Regarding '{dna['topic']}': This narrative emerged from {origin_str}. "
            f"It has reached a momentum score of {trend['momentum']}/100 ({m_state}) with a {trend['sentiment']} sentiment bias. "
            f"The core claim centers on \"{dna['core_claim']}\", with cross-platform amplification primarily led by {', '.join(bridges[:1] + amplifiers[:1])}."
        )


def answer_query(query: str) -> Dict[str, Any]:
    """
    Processes a natural language query against backend intelligence data.
    Returns: { "answer": str, "evidence": { "narrative_id": str, "show": List[str] }, "confidence": float }
    """
    narrative_id = detect_target_narrative(query)
    evidence_screens = detect_evidence_screens(query, narrative_id)
    
    # Gather structured facts for grounding
    dna = get_narrative_dna(narrative_id)
    trend = calculate_narrative_momentum(narrative_id)
    graph = build_narrative_graph(narrative_id)
    timeline = get_narrative_timeline(narrative_id)
    demographics = get_demographics(narrative_id)

    context = {
        "dna": dna,
        "trend": trend,
        "graph": graph,
        "timeline_count": len(timeline["events"]),
        "demographics": demographics
    }

    client = _get_gemini_client()
    if not client:
        answer = _synthesize_answer_rule_based(query, narrative_id, context)
        return {
            "answer": answer,
            "evidence": {
                "narrative_id": narrative_id,
                "show": evidence_screens
            },
            "confidence": 0.94
        }

    # Use Gemini with strict grounding
    prompt = f"""
You are Social Pulse AI's intelligence analyst backend.
Answer the user's inquiry accurately, concisely, and in plain English based ONLY on the structured narrative intelligence facts provided below.

FACTS:
- Narrative ID: {dna['id']}
- Topic: {dna['topic']}
- Core Claim: {dna['core_claim']}
- Origin: {json.dumps(dna['origin'])}
- Why Now / Triggers: {json.dumps(dna['why_now'])}
- Momentum: {trend['momentum']}/100 (State: {trend['momentum_state']}, Breakout Probability: {trend['breakout_probability']})
- Overall Sentiment: {trend['sentiment']}
- Key Graph Roles: Originators ({[n['id'] for n in graph['nodes'] if n['role'] == 'originator']}), Bridges ({[n['id'] for n in graph['nodes'] if n['role'] == 'bridge']}), Authorities ({[n['id'] for n in graph['nodes'] if n['role'] == 'authority']})
- Forecast: Expected Reach: {dna['forecast']['expected_reach']}, Expected Duration: {dna['forecast']['expected_duration_hours']} hours

USER QUERY:
"{query}"

INSTRUCTIONS:
Provide a crisp, direct, executive 2-4 sentence situational briefing answer.
"""
    try:
        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=prompt,
        )
        answer_text = response.text.strip()
        return {
            "answer": answer_text,
            "evidence": {
                "narrative_id": narrative_id,
                "show": evidence_screens
            },
            "confidence": 0.95
        }
    except Exception as e:
        logger.warning(f"Gemini Q&A generation failed: {e}. Using rule-based synthesizer.")
        answer = _synthesize_answer_rule_based(query, narrative_id, context)
        return {
            "answer": answer,
            "evidence": {
                "narrative_id": narrative_id,
                "show": evidence_screens
            },
            "confidence": 0.92
        }
