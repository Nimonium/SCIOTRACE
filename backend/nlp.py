"""
NLP Module for Social Pulse AI.
Performs Sentiment, Emotion, and Sarcasm classification using Google Gemini API (or robust heuristic fallback).
Supported emotions: curiosity, excitement, anxiety, anger, fear, support, opposition, uncertainty, mobilization.
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from db import get_db_connection, update_event_nlp

logger = logging.getLogger(__name__)

# Valid emotions vocabulary per specification
VALID_EMOTIONS = [
    "curiosity", "excitement", "anxiety", "anger",
    "fear", "support", "opposition", "uncertainty", "mobilization"
]

VALID_SENTIMENTS = ["positive", "negative", "neutral"]


def _extract_topics_and_entities_heuristic(text: str) -> Tuple[List[str], List[str]]:
    """
    Extracts 1-3 topics and key named entities from content using keyword/noun-phrase heuristics.
    Never returns a hardcoded generic placeholder when valid content words exist.
    """
    import re
    text_lower = text.lower()
    topics: List[str] = []
    entities: List[str] = []

    # 1. Regex for handles (@...) and hashtags (#...)
    handles = re.findall(r"@\w+", text)
    hashtags = re.findall(r"#\w+", text)
    for h in handles:
        if h not in entities:
            entities.append(h)
    for tag in hashtags:
        cleaned = tag.lstrip("#")
        formatted_tag = re.sub(r"([a-z])([A-Z])", r"\1 \2", cleaned)
        if formatted_tag not in topics and len(topics) < 3:
            topics.append(formatted_tag)

    # 2. Uppercase acronyms (e.g. NASA, NTA, ISRO, AI, RBI, PIB, ToD)
    acronyms = re.findall(r"\b[A-Z]{2,}\b", text)
    for acr in acronyms:
        if acr not in entities and len(acr) <= 8:
            entities.append(acr)

    # 3. Capitalized Multi-Word Phrases / Proper Nouns (e.g. "James Webb Space Telescope", "Education Ministry")
    cap_phrases = re.findall(r"\b[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)+\b", text)
    for cp in cap_phrases:
        cp_clean = cp.strip()
        if len(cp_clean.split()) <= 6:
            if cp_clean not in entities and len(entities) < 5:
                entities.append(cp_clean)
            if cp_clean not in topics and len(topics) < 2:
                topics.append(cp_clean)

    # 4. Known institutional / government / scientific entities
    known_entities = [
        "Education Ministry", "Dept of Higher Education", "NTA", "GovtExamAlerts",
        "National Student Alliance", "PIB", "FactCheck Watch",
        "State Power Regulatory Board", "City Power Discom", "Metro RWA Association",
        "National Consumer Forum", "Metro Rail Corporation",
        "Digital Rights & Privacy Alliance", "Terminal 3", "Central Station", "South Delhi",
        "NASA", "James Webb Space Telescope", "ISRO", "RBI"
    ]
    for ke in known_entities:
        if ke.lower() in text_lower and ke not in entities:
            entities.append(ke)

    # 5. Core domain rules for known storylines
    if any(k in text_lower for k in ["fee hike", "exam fee", "application fee", "eligibility test", "national entrance"]):
        if "Exam Fee Hike" not in topics:
            topics.insert(0, "Exam Fee Hike")
        if "Higher Education Policy" not in topics and len(topics) < 3:
            topics.append("Higher Education Policy")
    elif any(k in text_lower for k in ["facial recognition", "biometric", "turnstile", "turnstiles", "metro", "surveillance"]):
        if "Metro Biometric Ticketing" not in topics:
            topics.insert(0, "Metro Biometric Ticketing")
        if "Public Transit Surveillance" not in topics and len(topics) < 3:
            topics.append("Public Transit Surveillance")
    elif any(k in text_lower for k in ["smart meter", "tariff", "electricity", "surge pricing", "discom", "power demand"]) or re.search(r'\btod\b', text_lower):
        if "Smart Meter Peak Tariffs" not in topics:
            topics.insert(0, "Smart Meter Peak Tariffs")
        if "Residential Power Policy" not in topics and len(topics) < 3:
            topics.append("Residential Power Policy")

    # 6. Content-based extraction if topics is still empty
    if not topics:
        stop_words = {
            "the", "and", "for", "that", "this", "with", "have", "from", "are", "was", "will",
            "our", "all", "after", "years", "out", "over", "what", "just", "about", "million",
            "billion", "more", "some", "they", "been", "there", "when", "here", "their", "into",
            "said", "also", "then", "than", "were", "would", "could", "should", "your", "them",
            "which", "whose", "where", "does", "done", "doing", "very", "much", "each", "both"
        }
        words = [w for w in re.findall(r"\b[a-zA-Z]{4,}\b", text) if w.lower() not in stop_words]
        if words:
            lead_phrase = " ".join(words[:2]).title()
            topics.append(lead_phrase)
            if len(words) >= 4:
                second_phrase = " ".join(words[2:4]).title()
                topics.append(second_phrase)
        elif acronyms:
            topics.append(f"{acronyms[0]} Update")
        else:
            topics.append("Community Signal")

    return topics[:3], entities[:5]


def _classify_heuristic(text: str) -> Dict[str, Any]:
    """
    High-fidelity rule-based heuristic classifier used as a guaranteed offline fallback.
    """
    text_lower = text.lower()
    
    # Sarcasm detection
    sarcasm = False
    if any(phrase in text_lower for phrase in ["truly visionary", "wonderful innovation", "great job", "clap", "👏👏", "as if", "surely nothing could go wrong"]):
        if any(neg in text_lower for neg in ["fee", "hike", "tax", "loan", "price", "surcharge", "kill"]):
            sarcasm = True

    # Sentiment & Emotion classification
    sentiment = "neutral"
    emotion = "curiosity"

    if any(w in text_lower for w in ["protest", "boycott", "mass", "storm", "tag", "mobilize", "rally", "rollback", "petition", "action"]):
        sentiment = "negative"
        emotion = "mobilization"
    elif any(w in text_lower for w in ["outrage", "furious", "kill", "robbery", "scam", "commercialization", "unfair", "unacceptable"]):
        sentiment = "negative"
        emotion = "anger"
    elif any(w in text_lower for w in ["scared", "fear", "ruin", "die", "dread", "catastrophe", "afford"]):
        sentiment = "negative"
        emotion = "fear"
    elif any(w in text_lower for w in ["worry", "warning", "alarming", "anxious", "surge", "burden", "leak"]):
        sentiment = "negative"
        emotion = "anxiety"
    elif any(w in text_lower for w in ["oppose", "against", "object", "concerns", "surveillance", "unapproved", "misleading"]):
        sentiment = "negative"
        emotion = "opposition"
    elif any(w in text_lower for w in ["seamless", "great", "convenience", "improvement", "excited", "revolutionary", "fast", "terrific"]):
        sentiment = "positive"
        emotion = "excitement"
    elif any(w in text_lower for w in ["clarification", "intact", "fact check", "advisory", "approved", "support", "protect"]):
        sentiment = "positive" if any(k in text_lower for k in ["support", "intact", "protect", "clarification"]) else "neutral"
        emotion = "support"
    elif any(w in text_lower for w in ["unclear", "wonder", "whether", "perhaps", "rumor", "alleged", "working paper", "subsidize"]):
        sentiment = "neutral"
        emotion = "uncertainty"
    elif any(w in text_lower for w in ["what", "noticed", "how", "why", "check", "curious", "pilot", "circular"]):
        sentiment = "neutral"
        emotion = "curiosity"

    if sarcasm:
        sentiment = "negative"
        emotion = "anger"

    topics, entities = _extract_topics_and_entities_heuristic(text)

    return {
        "sentiment": sentiment,
        "emotion": emotion,
        "sarcasm_flag": sarcasm,
        "topics": topics,
        "entities": entities
    }


# Initialize VADER sentiment analyzer
try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    vader_analyzer = SentimentIntensityAnalyzer()
except Exception as e:
    logger.warning(f"Could not initialize VADER analyzer: {e}")
    vader_analyzer = None

METRICS_FILE = os.path.join(os.path.dirname(__file__), "nlp_metrics.json")

def _load_metrics() -> Dict[str, Any]:
    default = {
        "gemini_calls_real": 0,
        "gemini_calls_emulated": 0,
        "gemini_calls_today": 0,
        "gemini_calls_saved_by_local_model": 0,
        "estimated_gemini_tokens_used": 0,
        "local_classifications_count": 0,
        "total_posts_analyzed": 0,
    }
    if os.path.exists(METRICS_FILE):
        try:
            with open(METRICS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                default.update(data)
        except Exception:
            pass
    return default

# Running metrics for Stage 1 & Stage 4
NLP_METRICS = _load_metrics()

def _save_metrics():
    try:
        with open(METRICS_FILE, "w", encoding="utf-8") as f:
            json.dump(NLP_METRICS, f, indent=2)
    except Exception:
        pass

def get_nlp_usage_metrics() -> Dict[str, Any]:
    """Returns current NLP usage counters."""
    global NLP_METRICS
    NLP_METRICS = _load_metrics()
    return dict(NLP_METRICS)


def reset_nlp_metrics() -> Dict[str, Any]:
    """Resets running NLP usage metrics back to zero."""
    global NLP_METRICS
    NLP_METRICS = {
        "gemini_calls_real": 0,
        "gemini_calls_emulated": 0,
        "gemini_calls_today": 0,
        "gemini_calls_saved_by_local_model": 0,
        "estimated_gemini_tokens_used": 0,
        "local_classifications_count": 0,
        "total_posts_analyzed": 0,
    }
    _save_metrics()
    return dict(NLP_METRICS)


def _get_gemini_client():
    """Initializes Gemini client if GEMINI_API_KEY or GOOGLE_API_KEY is available."""
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except Exception:
        pass

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        return None
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        return client
    except Exception as e:
        logger.warning(f"Failed to initialize google-genai client: {e}")
        return None


def classify_text_local(text: str) -> Tuple[Dict[str, Any], Dict[str, float]]:
    """
    Lightweight local classification using VADER sentiment analysis + domain lexicon heuristics.
    Returns: (classification_result, vader_scores)
    """
    # 1. Base heuristic classification
    result = _classify_heuristic(text)
    
    # 2. VADER sentiment refinement if available
    vader_scores = {"neg": 0.0, "neu": 1.0, "pos": 0.0, "compound": 0.0}
    if vader_analyzer:
        try:
            vader_scores = vader_analyzer.polarity_scores(text)
            compound = vader_scores["compound"]
            # Sarcasm check takes precedence
            if not result.get("sarcasm_flag"):
                if compound >= 0.15:
                    result["sentiment"] = "positive"
                elif compound <= -0.15:
                    result["sentiment"] = "negative"
                else:
                    result["sentiment"] = "neutral"
        except Exception as e:
            logger.debug(f"VADER scoring error: {e}")
            
    return result, vader_scores


def assess_uncertainty(text: str, local_result: Dict[str, Any], vader_scores: Dict[str, float]) -> Tuple[bool, str]:
    """
    Uncertainty Gate: Determines whether content requires advanced LLM (Gemini) classification.
    Returns: (should_route_to_gemini: bool, reason: str)
    """
    text_lower = text.lower()
    words = text.split()

    # 1. Sarcasm / Irony indicators (e.g. praise phrases combined with negative impact, emoji-text mismatch)
    if local_result.get("sarcasm_flag"):
        return True, "sarcasm_detected"
    if any(p in text_lower for p in ["truly visionary", "wonderful innovation", "great job", "as if", "surely nothing"]):
        return True, "sarcasm_phrase_detected"
    if "👏" in text and any(w in text_lower for w in ["fee", "hike", "tax", "surcharge", "kill", "fail"]):
        return True, "emoji_sentiment_mismatch"

    # 2. Mixed signals: both positive and negative sub-scores are significant
    if vader_scores.get("pos", 0) >= 0.18 and vader_scores.get("neg", 0) >= 0.18:
        return True, "mixed_sentiment_signals"

    # 3. Short / Ambiguous content: very few words with low polarity
    if len(words) < 5 and abs(vader_scores.get("compound", 0)) < 0.15:
        return True, "short_ambiguous_text"

    # 4. Subtle administrative / institutional context where emotion is masked by formal language
    if vader_scores.get("neu", 0) > 0.90:
        if any(w in text_lower for w in ["unapproved", "draft", "working paper", "pilot", "circular", "tender", "cabinet"]):
            return True, "subtle_policy_context"

    return False, "confident_local_match"


def classify_text_hybrid(text: str, force_gemini: bool = False) -> Dict[str, Any]:
    """
    Three-Tier Hybrid Classification Engine:
    1. Fast Local Tier (VADER + domain lexicon) for straightforward posts.
    2. Uncertainty Gate determines whether post has mixed signals, sarcasm, or ambiguity.
    3. Gemini Tier for complex/ambiguous cases (falls back to local if API key missing).
    """
    local_result, vader_scores = classify_text_local(text)
    is_uncertain, reason = assess_uncertainty(text, local_result, vader_scores)

    # Route: Local Model
    if not is_uncertain and not force_gemini:
        NLP_METRICS["local_classifications_count"] += 1
        NLP_METRICS["gemini_calls_saved_by_local_model"] += 1
        NLP_METRICS["total_posts_analyzed"] += 1
        _save_metrics()
        logger.info(f"[NLP-ROUTE] LOCAL | Reason: {reason} | Content: '{text[:50]}...'")
        local_result["routed_to"] = "local"
        return local_result

    # Route: Gemini Model (Escalation triggered by uncertainty gate)
    est_tokens = len(text.split()) * 4 + 250
    NLP_METRICS["total_posts_analyzed"] += 1
    NLP_METRICS["gemini_calls_today"] += 1

    client = _get_gemini_client()
    if not client:
        # Escalated by uncertainty gate, but served locally via offline heuristic because no API key is present
        NLP_METRICS["gemini_calls_emulated"] += 1
        NLP_METRICS["estimated_gemini_tokens_used"] += est_tokens
        _save_metrics()
        logger.info(f"[NLP-ROUTE] GEMINI ESCALATION (Heuristic Emulated - Would require live key) | Reason: {reason} | EstTokens: ~{est_tokens} | Content: '{text[:50]}...'")
        local_result["routed_to"] = "gemini_emulated"
        return local_result

    # Real live Gemini call with configured client
    NLP_METRICS["gemini_calls_real"] += 1
    NLP_METRICS["estimated_gemini_tokens_used"] += est_tokens
    _save_metrics()

    # Call Gemini for uncertain cases
    prompt = f"""You are an expert Social Media NLP intelligence engine for situational awareness.
Analyze the following social post and classify its sentiment, primary emotion, sarcasm, topics, and named entities.

EMOTION MUST BE EXACTLY ONE OF:
["curiosity", "excitement", "anxiety", "anger", "fear", "support", "opposition", "uncertainty", "mobilization"]

SENTIMENT MUST BE EXACTLY ONE OF:
["positive", "negative", "neutral"]

POST CONTENT:
\"\"\"{text}\"\"\"

Return ONLY valid JSON matching this schema:
{{
  "sentiment": "positive" | "negative" | "neutral",
  "emotion": "curiosity" | "excitement" | "anxiety" | "anger" | "fear" | "support" | "opposition" | "uncertainty" | "mobilization",
  "sarcasm_flag": true | false,
  "topics": ["topic1", "topic2"],
  "entities": ["entity1", "entity2"]
}}
"""
    try:
        logger.info(f"[NLP-ROUTE] GEMINI LIVE | Reason: {reason} | EstTokens: ~{est_tokens} | Content: '{text[:50]}...'")

        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=prompt,
        )
        resp_text = response.text.strip()
        if resp_text.startswith("```json"):
            resp_text = resp_text[7:]
        if resp_text.startswith("```"):
            resp_text = resp_text[3:]
        if resp_text.endswith("```"):
            resp_text = resp_text[:-3]
        
        parsed = json.loads(resp_text.strip())
        
        sentiment = parsed.get("sentiment", "neutral").lower()
        if sentiment not in VALID_SENTIMENTS:
            sentiment = local_result["sentiment"]
            
        emotion = parsed.get("emotion", "curiosity").lower()
        if emotion not in VALID_EMOTIONS:
            emotion = local_result["emotion"]
            
        sarcasm_flag = bool(parsed.get("sarcasm_flag", False))
        topics = [str(t) for t in parsed.get("topics", []) if t][:3] or local_result["topics"]
        entities = [str(e) for e in parsed.get("entities", []) if e][:5] or local_result["entities"]
        
        return {
            "sentiment": sentiment,
            "emotion": emotion,
            "sarcasm_flag": sarcasm_flag,
            "topics": topics,
            "entities": entities,
            "routed_to": "gemini"
        }
    except Exception as e:
        logger.warning(f"Gemini API NLP classification error: {e}. Falling back to local model.")
        local_result["routed_to"] = "local_error_fallback"
        return local_result


def classify_text_with_gemini(text: str) -> Dict[str, Any]:
    """
    Backward-compatible entry point. Uses hybrid classification.
    """
    return classify_text_hybrid(text)


def classify_batch_with_gemini(texts: List[str]) -> List[Dict[str, Any]]:
    """
    Batches multiple posts into a single Gemini prompt request to minimize roundtrips and token overhead.
    Falls back to individual hybrid classification if batch call fails or client is unavailable.
    """
    client = _get_gemini_client()
    if not client or not texts:
        return [classify_text_hybrid(t) for t in texts]

    formatted_items = [{"id": i, "content": t} for i, t in enumerate(texts)]
    batch_json = json.dumps(formatted_items, ensure_ascii=False)

    prompt = f"""You are an expert Social Media NLP intelligence engine.
Analyze each post in the following JSON array and classify its sentiment, emotion, sarcasm, topics, and named entities.

VALID EMOTIONS: ["curiosity", "excitement", "anxiety", "anger", "fear", "support", "opposition", "uncertainty", "mobilization"]
VALID SENTIMENTS: ["positive", "negative", "neutral"]

INPUT ARRAY:
{batch_json}

Return ONLY valid JSON array with an object for each post:
[
  {{
    "id": 0,
    "sentiment": "positive" | "negative" | "neutral",
    "emotion": "curiosity" | "excitement" | "anxiety" | "anger" | "fear" | "support" | "opposition" | "uncertainty" | "mobilization",
    "sarcasm_flag": true | false,
    "topics": ["topic1"],
    "entities": ["entity1"]
  }}
]
"""
    try:
        NLP_METRICS["gemini_calls_real"] += 1
        NLP_METRICS["gemini_calls_today"] += 1
        est_tokens = sum(len(t.split()) for t in texts) * 4 + 400
        NLP_METRICS["estimated_gemini_tokens_used"] += est_tokens
        NLP_METRICS["total_posts_analyzed"] += len(texts)

        logger.info(f"[NLP-BATCH] Processing batch of {len(texts)} posts with Gemini | EstTokens: ~{est_tokens}")

        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=prompt,
        )
        resp_text = response.text.strip()
        if resp_text.startswith("```json"):
            resp_text = resp_text[7:]
        if resp_text.startswith("```"):
            resp_text = resp_text[3:]
        if resp_text.endswith("```"):
            resp_text = resp_text[:-3]

        parsed_list = json.loads(resp_text.strip())
        results_map = {item.get("id"): item for item in parsed_list if isinstance(item, dict)}

        final_results = []
        for i, text in enumerate(texts):
            if i in results_map:
                res = results_map[i]
                final_results.append({
                    "sentiment": res.get("sentiment", "neutral"),
                    "emotion": res.get("emotion", "curiosity"),
                    "sarcasm_flag": bool(res.get("sarcasm_flag", False)),
                    "topics": res.get("topics", [])[:3],
                    "entities": res.get("entities", [])[:5],
                    "routed_to": "gemini_batch"
                })
            else:
                final_results.append(classify_text_local(text)[0])
        return final_results
    except Exception as e:
        logger.warning(f"Batch Gemini classification failed: {e}. Falling back to individual hybrid.")
        return [classify_text_hybrid(t) for t in texts]


def batch_classify_and_update(limit: Optional[int] = None) -> int:
    """
    Processes unclassified or all events using the hybrid classification pipeline,
    and updates database rows.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if limit:
        cursor.execute("SELECT id, content FROM events LIMIT ?", (limit,))
    else:
        cursor.execute("SELECT id, content FROM events")
        
    rows = cursor.fetchall()
    conn.close()

    updated_count = 0
    for row in rows:
        event_id = row["id"]
        content = row["content"]
        nlp_res = classify_text_hybrid(content)
        update_event_nlp(
            event_id=event_id,
            sentiment=nlp_res["sentiment"],
            emotion=nlp_res["emotion"],
            sarcasm_flag=nlp_res["sarcasm_flag"],
            topics=nlp_res.get("topics", []),
            entities=nlp_res.get("entities", [])
        )
        updated_count += 1

    logger.info(f"Hybrid NLP classification completed for {updated_count} events.")
    return updated_count
