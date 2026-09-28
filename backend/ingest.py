"""
Ingestion module for Social Pulse AI.
Handles ingestion, normalization, and rich seed data generation for multi-platform narratives:
1. Policy X National Exam Fee Hike (Viral, momentum ~95)
2. Smart Meter Peak Hour Power Tariff Surcharge (Accelerating, momentum ~65)
3. AI Facial Recognition at Metro Turnstiles Pilot (Emerging, momentum ~32)
"""

from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
import uuid
import json
import logging
from db import insert_events, clear_events, init_db

logger = logging.getLogger(__name__)


def normalize_telegram_message(raw: Dict[str, Any], narrative_id: Optional[str] = None) -> Dict[str, Any]:
    """Normalizes a raw Telegram message into the core event schema."""
    raw_id = str(raw.get("id") or raw.get("message_id") or uuid.uuid4().hex[:12])
    msg_id = raw_id if raw_id.startswith("tg_") else f"tg_{raw_id}"
    
    author = raw.get("from_user", {}) if isinstance(raw.get("from_user"), dict) else {}
    raw_author_id = str(author.get("id") or raw.get("author_id") or raw.get("sender_chat", {}).get("id") or "anon")
    author_id = raw_author_id if raw_author_id.startswith("tg_") else f"tg_{raw_author_id}"
    author_name = str(author.get("username") or author.get("first_name") or raw.get("author_name") or author_id)
    
    timestamp = raw.get("timestamp") or raw.get("date")
    if isinstance(timestamp, (int, float)):
        ts_iso = datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()
    elif isinstance(timestamp, str):
        ts_iso = timestamp
    else:
        ts_iso = datetime.now(timezone.utc).isoformat()

    reply_to = raw.get("reply_to_message_id") or raw.get("parent_id")
    parent_id = None
    if reply_to:
        reply_str = str(reply_to)
        parent_id = reply_str if (reply_str.startswith("tg_") or reply_str.startswith("x_")) else f"tg_{reply_str}"
        
    content = raw.get("text") or raw.get("caption") or raw.get("content") or ""

    return {
        "id": msg_id,
        "platform": "telegram",
        "author_id": author_id,
        "author_name": author_name,
        "content": content,
        "timestamp": ts_iso,
        "parent_id": parent_id,
        "interaction_type": "forward" if raw.get("forward_from") else ("reply" if parent_id else "post"),
        "community_id": raw.get("community_id"),
        "narrative_id": narrative_id or raw.get("narrative_id"),
        "sentiment": raw.get("sentiment"),
        "emotion": raw.get("emotion"),
        "sarcasm_flag": 1 if raw.get("sarcasm_flag") else 0,
        "engagement_score": int(raw.get("views", 0) + raw.get("forwards", 0) * 5 + raw.get("engagement_score", 0)),
        "raw_metadata": json.dumps(raw)
    }


def normalize_x_post(raw: Dict[str, Any], narrative_id: Optional[str] = None) -> Dict[str, Any]:
    """Normalizes a raw X / Twitter tweet object into the core event schema."""
    raw_id = str(raw.get("id") or raw.get("id_str") or uuid.uuid4().hex[:12])
    tweet_id = raw_id if raw_id.startswith("x_") else f"x_{raw_id}"
    
    raw_author = str(raw.get("author_id") or raw.get("user", {}).get("id_str") or "anon")
    author_id = raw_author if raw_author.startswith("x_") else f"x_{raw_author}"
    author_name = str(raw.get("author_name") or raw.get("user", {}).get("screen_name") or raw.get("user", {}).get("name") or author_id)
    
    timestamp = raw.get("created_at") or raw.get("timestamp")
    if isinstance(timestamp, str):
        try:
            dt = datetime.strptime(timestamp, "%a %b %d %H:%M:%S %z %Y")
            ts_iso = dt.isoformat()
        except ValueError:
            ts_iso = timestamp
    elif isinstance(timestamp, (int, float)):
        ts_iso = datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()
    else:
        ts_iso = datetime.now(timezone.utc).isoformat()

    ref_tweets = raw.get("referenced_tweets", [])
    parent_id = None
    interaction_type = "post"
    if ref_tweets:
        ref_type = ref_tweets[0].get("type")
        ref_id_str = str(ref_tweets[0].get('id'))
        parent_id = ref_id_str if (ref_id_str.startswith("x_") or ref_id_str.startswith("tg_")) else f"x_{ref_id_str}"
        interaction_type = "retweet" if ref_type == "retweeted" else ("reply" if ref_type == "replied_to" else "quote")
    elif raw.get("in_reply_to_status_id_str") or raw.get("parent_id"):
        raw_p = str(raw.get("in_reply_to_status_id_str") or raw.get("parent_id"))
        parent_id = raw_p if (raw_p.startswith("x_") or raw_p.startswith("tg_")) else f"x_{raw_p}"
        interaction_type = "reply"

    metrics = raw.get("public_metrics") or raw.get("metrics") or {}
    likes = metrics.get("like_count", raw.get("favorite_count", 0))
    retweets = metrics.get("retweet_count", 0)
    replies = metrics.get("reply_count", 0)
    engagement_score = int(likes + (retweets * 3) + (replies * 2) + raw.get("engagement_score", 0))

    return {
        "id": tweet_id,
        "platform": "x",
        "author_id": author_id,
        "author_name": author_name,
        "content": raw.get("text") or raw.get("content") or "",
        "timestamp": ts_iso,
        "parent_id": parent_id,
        "interaction_type": interaction_type,
        "community_id": raw.get("community_id"),
        "narrative_id": narrative_id or raw.get("narrative_id"),
        "sentiment": raw.get("sentiment"),
        "emotion": raw.get("emotion"),
        "sarcasm_flag": 1 if raw.get("sarcasm_flag") else 0,
        "engagement_score": engagement_score,
        "raw_metadata": json.dumps(raw)
    }


def generate_seed_events() -> List[Dict[str, Any]]:
    """Generates rich, multi-platform synthetic seed events with deep network topologies."""
    now = datetime.now(timezone.utc)
    events: List[Dict[str, Any]] = []

    # =========================================================================
    # NARRATIVE 1: Policy X Fee Hike (VIRAL, ~95/100 Momentum, 13 Nodes, 14 Edges)
    # =========================================================================
    n1_id = "narrative-policy-fee-hike"
    base_t1 = now - timedelta(hours=6)

    n1_raw = [
        # Telegram Community 0: Aspirants & Leakers
        {
            "id": "tg_leak_101",
            "platform": "telegram",
            "author_id": "tg_govt_exam_alerts",
            "author_name": "GovtExamAlerts Channel",
            "content": "🚨 LEAKED DRAFT: Education Ministry proposed 300% fee hike for National Eligibility Test 2026. Application fee jumping from Rs 1,000 to Rs 4,000. Circular under review.",
            "timestamp": (base_t1).isoformat(),
            "parent_id": None,
            "interaction_type": "post",
            "community_id": 0,
            "narrative_id": n1_id,
            "sentiment": "negative",
            "emotion": "anxiety",
            "sarcasm_flag": 0,
            "engagement_score": 14200
        },
        {
            "id": "tg_reply_102",
            "platform": "telegram",
            "author_id": "tg_aspirant_rahul",
            "author_name": "Rahul Verma (Aspirant)",
            "content": "Is this verified admin? How can underprivileged rural students afford Rs 4000 just to sit for an exam? This will kill our dreams.",
            "timestamp": (base_t1 + timedelta(minutes=15)).isoformat(),
            "parent_id": "tg_leak_101",
            "interaction_type": "reply",
            "community_id": 0,
            "narrative_id": n1_id,
            "sentiment": "negative",
            "emotion": "fear",
            "sarcasm_flag": 0,
            "engagement_score": 4800
        },
        {
            "id": "tg_fwd_103",
            "platform": "telegram",
            "author_id": "tg_student_union_official",
            "author_name": "National Student Alliance",
            "content": "Forwarding from GovtExamAlerts. We are cross-verifying the draft memo. If genuine, this is outright commercialization of public education!",
            "timestamp": (base_t1 + timedelta(minutes=30)).isoformat(),
            "parent_id": "tg_leak_101",
            "interaction_type": "forward",
            "community_id": 0,
            "narrative_id": n1_id,
            "sentiment": "negative",
            "emotion": "anger",
            "sarcasm_flag": 0,
            "engagement_score": 18500
        },
        {
            "id": "tg_post_104",
            "platform": "telegram",
            "author_id": "tg_coaching_hub_delhi",
            "author_name": "Delhi Coaching Network",
            "content": "Alerting all batch 2026 students: Circulating circular indicates a massive 4x application fee spike. Prepare representations immediately.",
            "timestamp": (base_t1 + timedelta(minutes=45)).isoformat(),
            "parent_id": "tg_fwd_103",
            "interaction_type": "reply",
            "community_id": 0,
            "narrative_id": n1_id,
            "sentiment": "negative",
            "emotion": "anxiety",
            "sarcasm_flag": 0,
            "engagement_score": 9200
        },
        {
            "id": "tg_post_105",
            "platform": "telegram",
            "author_id": "tg_youth_front",
            "author_name": "Youth Democratic Front",
            "content": "Calling an emergency coordination meeting across all regional state universities to fight this fee hike.",
            "timestamp": (base_t1 + timedelta(hours=1)).isoformat(),
            "parent_id": "tg_fwd_103",
            "interaction_type": "reply",
            "community_id": 0,
            "narrative_id": n1_id,
            "sentiment": "negative",
            "emotion": "mobilization",
            "sarcasm_flag": 0,
            "engagement_score": 11300
        },

        # X (Twitter) Community 1: Activists, Youth Sphere & Amplifiers
        {
            "id": "x_tweet_201",
            "platform": "x",
            "author_id": "x_edu_watchdog",
            "author_name": "EduWatchdog India (@EduWatchdog)",
            "content": "Disturbing document circulating on Telegram channels. Internal draft claims National Entrance Test fees to be increased by 300% starting Next Session. Over 2.5 million candidates affected. #ExamFeeHike #RollbackFeeHike",
            "timestamp": (base_t1 + timedelta(hours=1, minutes=15)).isoformat(),
            "parent_id": "tg_leak_101",
            "interaction_type": "post",
            "community_id": 1,
            "narrative_id": n1_id,
            "sentiment": "negative",
            "emotion": "opposition",
            "sarcasm_flag": 0,
            "engagement_score": 28900
        },
        {
            "id": "x_tweet_202",
            "platform": "x",
            "author_id": "x_campus_pulse",
            "author_name": "Campus Pulse (@CampusPulse)",
            "content": "RT @EduWatchdog: 300% fee hike in competitive exams is a direct tax on merit and poor families! Education is a right, not a profit venture! RT if you agree! #ExamFeeHike",
            "timestamp": (base_t1 + timedelta(hours=1, minutes=45)).isoformat(),
            "parent_id": "x_tweet_201",
            "interaction_type": "retweet",
            "community_id": 1,
            "narrative_id": n1_id,
            "sentiment": "negative",
            "emotion": "anger",
            "sarcasm_flag": 0,
            "engagement_score": 45000
        },
        {
            "id": "x_tweet_203",
            "platform": "x",
            "author_id": "x_prof_sharma",
            "author_name": "Prof. S. Sharma (@ProfSharmaAnalyzes)",
            "content": "A 4x increase in application fees will immediately exclude Tier 3 & rural aspirants. While administrative costs for computer-based tests have risen, the state must subsidize testing infrastructure. #EducationPolicy",
            "timestamp": (base_t1 + timedelta(hours=2, minutes=15)).isoformat(),
            "parent_id": "x_tweet_201",
            "interaction_type": "reply",
            "community_id": 1,
            "narrative_id": n1_id,
            "sentiment": "negative",
            "emotion": "uncertainty",
            "sarcasm_flag": 0,
            "engagement_score": 19450
        },
        {
            "id": "x_tweet_204",
            "platform": "x",
            "author_id": "x_youth_action",
            "author_name": "Youth Action Cell (@YouthAction)",
            "content": "Mass digital protest tomorrow at 11 AM! Everyone tweet with #RollbackFeeHike and tag @EducationMin and NTA. We won't let them price students out of public universities!",
            "timestamp": (base_t1 + timedelta(hours=3, minutes=0)).isoformat(),
            "parent_id": "x_tweet_202",
            "interaction_type": "retweet",
            "community_id": 1,
            "narrative_id": n1_id,
            "sentiment": "negative",
            "emotion": "mobilization",
            "sarcasm_flag": 0,
            "engagement_score": 62000
        },
        {
            "id": "x_tweet_205",
            "platform": "x",
            "author_id": "x_snarky_grad",
            "author_name": "Snarky Graduate (@SnarkyGrad)",
            "content": "Wow, wonderful innovation! Now you need a bank loan just to apply for an exam you might not even qualify for. Truly visionary development! 👏👏 #ExamFeeHike",
            "timestamp": (base_t1 + timedelta(hours=3, minutes=30)).isoformat(),
            "parent_id": "x_tweet_201",
            "interaction_type": "reply",
            "community_id": 1,
            "narrative_id": n1_id,
            "sentiment": "negative",
            "emotion": "anger",
            "sarcasm_flag": 1,
            "engagement_score": 14300
        },
        {
            "id": "x_tweet_206",
            "platform": "x",
            "author_id": "x_national_daily",
            "author_name": "National Daily News (@NationalDaily)",
            "content": "Top Trend: #ExamFeeHike crosses 250k posts as student bodies erupt over leaked memo alleging 300% registration fee rise. Ministry response awaited.",
            "timestamp": (base_t1 + timedelta(hours=4, minutes=0)).isoformat(),
            "parent_id": "x_tweet_204",
            "interaction_type": "retweet",
            "community_id": 1,
            "narrative_id": n1_id,
            "sentiment": "negative",
            "emotion": "mobilization",
            "sarcasm_flag": 0,
            "engagement_score": 38900
        },

        # Community 2: Institutional & Fact Checkers
        {
            "id": "x_tweet_207",
            "platform": "x",
            "author_id": "x_dept_higher_edu",
            "author_name": "Dept of Higher Education (@DeptHigherEdu)",
            "content": "FACT CHECK: A purported memo alleging a 300% increase in national exam application fees is unapproved and misleading. No decision on fee revision has been finalized. Beware of unverified circulars.",
            "timestamp": (base_t1 + timedelta(hours=4, minutes=45)).isoformat(),
            "parent_id": "x_tweet_201",
            "interaction_type": "reply",
            "community_id": 2,
            "narrative_id": n1_id,
            "sentiment": "neutral",
            "emotion": "support",
            "sarcasm_flag": 0,
            "engagement_score": 41500
        },
        {
            "id": "x_tweet_208",
            "platform": "x",
            "author_id": "x_factchecker_in",
            "author_name": "PIB & FactCheck Watch (@FactCheckWatch)",
            "content": "Official statement released regarding #ExamFeeHike: Ministry clarifies the document was an exploratory committee working paper from 2024, not an executive order. Current fee structure remains intact.",
            "timestamp": (base_t1 + timedelta(hours=5, minutes=15)).isoformat(),
            "parent_id": "x_tweet_207",
            "interaction_type": "reply",
            "community_id": 2,
            "narrative_id": n1_id,
            "sentiment": "positive",
            "emotion": "support",
            "sarcasm_flag": 0,
            "engagement_score": 27800
        }
    ]

    # =========================================================================
    # NARRATIVE 2: Power Tariff Surge (ACCELERATING, ~65/100 Momentum, 10 Nodes, 10 Edges)
    # =========================================================================
    n2_id = "narrative-surge-surcharge"
    base_t2 = now - timedelta(hours=9)

    n2_raw = [
        # Telegram Community 0: Resident Welfare Groups
        {
            "id": "tg_power_01",
            "platform": "telegram",
            "author_id": "tg_rwa_metro_network",
            "author_name": "Metro RWA Association",
            "content": "Warning to residents: Smart meter rollouts will introduce dynamic 1.8x pricing between 6PM and 10PM starting next month. Check your bills!",
            "timestamp": (base_t2).isoformat(),
            "parent_id": None,
            "interaction_type": "post",
            "community_id": 0,
            "narrative_id": n2_id,
            "sentiment": "negative",
            "emotion": "anxiety",
            "sarcasm_flag": 0,
            "engagement_score": 4200
        },
        {
            "id": "tg_power_02",
            "platform": "telegram",
            "author_id": "tg_resident_delhi_south",
            "author_name": "South Delhi Residents Forum",
            "content": "Our colony already had 3 smart meters installed yesterday without prior notification. Is the peak tariff active right now?",
            "timestamp": (base_t2 + timedelta(minutes=40)).isoformat(),
            "parent_id": "tg_power_01",
            "interaction_type": "reply",
            "community_id": 0,
            "narrative_id": n2_id,
            "sentiment": "negative",
            "emotion": "anxiety",
            "sarcasm_flag": 0,
            "engagement_score": 1900
        },
        {
            "id": "tg_power_03",
            "platform": "telegram",
            "author_id": "tg_apartment_federation",
            "author_name": "Apartment Federation Council",
            "content": "Passing resolution in our AGM to withhold smart meter access until electricity board issues written tariff guarantees.",
            "timestamp": (base_t2 + timedelta(hours=1, minutes=10)).isoformat(),
            "parent_id": "tg_power_01",
            "interaction_type": "forward",
            "community_id": 0,
            "narrative_id": n2_id,
            "sentiment": "negative",
            "emotion": "opposition",
            "sarcasm_flag": 0,
            "engagement_score": 3400
        },

        # X (Twitter) Community 1: Consumer Watchdogs & Energy Columnists
        {
            "id": "x_power_04",
            "platform": "x",
            "author_id": "x_consumer_forum",
            "author_name": "National Consumer Forum (@ConsumerForumIn)",
            "content": "Hearing alarming reports of mandatory peak hour surcharge on residential power consumers through smart meters. Discoms must clarify immediately! #ElectricityBill #SmartMeterSurge",
            "timestamp": (base_t2 + timedelta(hours=1, minutes=50)).isoformat(),
            "parent_id": "tg_power_01",
            "interaction_type": "post",
            "community_id": 1,
            "narrative_id": n2_id,
            "sentiment": "negative",
            "emotion": "opposition",
            "sarcasm_flag": 0,
            "engagement_score": 11200
        },
        {
            "id": "x_power_05",
            "platform": "x",
            "author_id": "x_energy_pulse",
            "author_name": "Energy Pulse Insights (@EnergyPulse)",
            "content": "Time of Day (ToD) tariffs are standard globally to flatten peak demand curves, but residential tariffs require public consultations. The sudden rollout lacks transparent communication.",
            "timestamp": (base_t2 + timedelta(hours=2, minutes=30)).isoformat(),
            "parent_id": "x_power_04",
            "interaction_type": "reply",
            "community_id": 1,
            "narrative_id": n2_id,
            "sentiment": "neutral",
            "emotion": "uncertainty",
            "sarcasm_flag": 0,
            "engagement_score": 6800
        },
        {
            "id": "x_power_06",
            "platform": "x",
            "author_id": "x_tech_utility_analyst",
            "author_name": "Grid Watcher Vikram (@GridVikram)",
            "content": "Smart meters enable 15-min interval logging. If discoms push dynamic rates without transparent dashboard APIs for consumers, legal challenges are inevitable.",
            "timestamp": (base_t2 + timedelta(hours=3, minutes=15)).isoformat(),
            "parent_id": "x_power_04",
            "interaction_type": "reply",
            "community_id": 1,
            "narrative_id": n2_id,
            "sentiment": "negative",
            "emotion": "opposition",
            "sarcasm_flag": 0,
            "engagement_score": 4500
        },
        {
            "id": "x_power_07",
            "platform": "x",
            "author_id": "x_urban_activist",
            "author_name": "Urban Citizens Guild (@UrbanGuild)",
            "content": "We demand open public hearings before any dynamic peak tariffs are enabled on domestic meters. Tagging @PowerBoardState.",
            "timestamp": (base_t2 + timedelta(hours=4, minutes=0)).isoformat(),
            "parent_id": "x_power_04",
            "interaction_type": "retweet",
            "community_id": 1,
            "narrative_id": n2_id,
            "sentiment": "negative",
            "emotion": "mobilization",
            "sarcasm_flag": 0,
            "engagement_score": 7900
        },

        # Community 2: Regulatory Authority
        {
            "id": "x_power_08",
            "platform": "x",
            "author_id": "x_power_board_state",
            "author_name": "State Power Regulatory Board (@PowerBoardState)",
            "content": "OFFICIAL ADVISORY: Smart meters do NOT incur differential surge pricing for domestic consumer slabs under 500 units. Peak tariff is optional for commercial/industrial consumers only.",
            "timestamp": (base_t2 + timedelta(hours=5, minutes=0)).isoformat(),
            "parent_id": "x_power_04",
            "interaction_type": "reply",
            "community_id": 2,
            "narrative_id": n2_id,
            "sentiment": "positive",
            "emotion": "support",
            "sarcasm_flag": 0,
            "engagement_score": 15600
        },
        {
            "id": "x_power_09",
            "platform": "x",
            "author_id": "x_discom_md",
            "author_name": "City Power Discom (@CityPowerDiscom)",
            "content": "Clarification: Smart meters provide accurate automated billing and eliminate estimated meter readings. Zero surge penalty applies to households.",
            "timestamp": (base_t2 + timedelta(hours=5, minutes=45)).isoformat(),
            "parent_id": "x_power_08",
            "interaction_type": "reply",
            "community_id": 2,
            "narrative_id": n2_id,
            "sentiment": "positive",
            "emotion": "support",
            "sarcasm_flag": 0,
            "engagement_score": 8300
        },
        {
            "id": "tg_power_10",
            "platform": "telegram",
            "author_id": "tg_green_grid_india",
            "author_name": "Green Grid Network",
            "content": "Discom has issued formal clarification: domestic tariffs remain flat. Forwarding the advisory PDF to all colony groups.",
            "timestamp": (base_t2 + timedelta(hours=6, minutes=30)).isoformat(),
            "parent_id": "x_power_08",
            "interaction_type": "post",
            "community_id": 0,
            "narrative_id": n2_id,
            "sentiment": "positive",
            "emotion": "support",
            "sarcasm_flag": 0,
            "engagement_score": 2700
        }
    ]

    # =========================================================================
    # NARRATIVE 3: AI Metro Face Pilot (EMERGING, ~32/100 Momentum, 9 Nodes, 9 Edges)
    # =========================================================================
    n3_id = "narrative-metro-ai-pilot"
    base_t3 = now - timedelta(hours=14)

    n3_raw = [
        # Telegram Community 0: Commuters
        {
            "id": "tg_metro_01",
            "platform": "telegram",
            "author_id": "tg_commuters_daily",
            "author_name": "Metro Commuters Daily",
            "content": "Noticed high-res optical scanning cameras installed at major junction metro turnstiles today. Staff said it's biometric frictionless ticketing pilot.",
            "timestamp": (base_t3).isoformat(),
            "parent_id": None,
            "interaction_type": "post",
            "community_id": 0,
            "narrative_id": n3_id,
            "sentiment": "neutral",
            "emotion": "curiosity",
            "sarcasm_flag": 0,
            "engagement_score": 920
        },
        {
            "id": "tg_metro_02",
            "platform": "telegram",
            "author_id": "tg_metro_tech_spotted",
            "author_name": "Transit Tech Spotters",
            "content": "Saw sensors at Gate 4 and Gate 7 at Central Station. Seems linked to an automated facial recognition gate system.",
            "timestamp": (base_t3 + timedelta(minutes=30)).isoformat(),
            "parent_id": "tg_metro_01",
            "interaction_type": "reply",
            "community_id": 0,
            "narrative_id": n3_id,
            "sentiment": "neutral",
            "emotion": "curiosity",
            "sarcasm_flag": 0,
            "engagement_score": 640
        },
        {
            "id": "tg_metro_03",
            "platform": "telegram",
            "author_id": "tg_civic_delhi_tg",
            "author_name": "Civic Delhi Watch",
            "content": "Has metro corporation announced any privacy guidelines on where facial templates will be stored?",
            "timestamp": (base_t3 + timedelta(hours=1)).isoformat(),
            "parent_id": "tg_metro_01",
            "interaction_type": "reply",
            "community_id": 0,
            "narrative_id": n3_id,
            "sentiment": "neutral",
            "emotion": "uncertainty",
            "sarcasm_flag": 0,
            "engagement_score": 850
        },

        # X (Twitter) Community 1: Privacy Advocates & Commuter Tech
        {
            "id": "x_metro_04",
            "platform": "x",
            "author_id": "x_privacy_matters",
            "author_name": "Digital Rights & Privacy Alliance (@PrivacyMatters)",
            "content": "Automated facial recognition pilots at public transit hubs without explicit opt-in data protection policy raises serious civil privacy concerns and opposition. Where is the privacy impact assessment? #DigitalSurveillance",
            "timestamp": (base_t3 + timedelta(hours=1, minutes=45)).isoformat(),
            "parent_id": "tg_metro_01",
            "interaction_type": "post",
            "community_id": 1,
            "narrative_id": n3_id,
            "sentiment": "negative",
            "emotion": "opposition",
            "sarcasm_flag": 0,
            "engagement_score": 3800
        },
        {
            "id": "x_metro_05",
            "platform": "x",
            "author_id": "x_transit_tech",
            "author_name": "Transit Tech Reviewer (@TransitTech)",
            "content": "Just tested the biometric frictionless gate at Terminal 3. Seamless pass in under 0.4 seconds without taking out cards or phones. Major convenience improvement during peak rush!",
            "timestamp": (base_t3 + timedelta(hours=2, minutes=30)).isoformat(),
            "parent_id": "x_metro_04",
            "interaction_type": "reply",
            "community_id": 1,
            "narrative_id": n3_id,
            "sentiment": "positive",
            "emotion": "excitement",
            "sarcasm_flag": 0,
            "engagement_score": 2400
        },
        {
            "id": "x_metro_06",
            "platform": "x",
            "author_id": "x_ai_ethics_fellow",
            "author_name": "Dr. Ananya Ray (@AI_Ethics_Ray)",
            "content": "We strongly object to unvetted biometric cameras in public transit. Storing commuter biometric databases creates severe privacy concerns and surveillance risks without safeguards.",
            "timestamp": (base_t3 + timedelta(hours=3, minutes=10)).isoformat(),
            "parent_id": "x_metro_04",
            "interaction_type": "reply",
            "community_id": 1,
            "narrative_id": n3_id,
            "sentiment": "negative",
            "emotion": "opposition",
            "sarcasm_flag": 0,
            "engagement_score": 1900
        },
        {
            "id": "x_metro_07",
            "platform": "x",
            "author_id": "x_urban_commuter_sam",
            "author_name": "Samir Commutes (@SamirCommutes)",
            "content": "If this reduces Monday morning queue from 15 mins to 10 seconds, I'm all for it. Just don't make it mandatory for everyone.",
            "timestamp": (base_t3 + timedelta(hours=4, minutes=0)).isoformat(),
            "parent_id": "x_metro_05",
            "interaction_type": "reply",
            "community_id": 1,
            "narrative_id": n3_id,
            "sentiment": "positive",
            "emotion": "support",
            "sarcasm_flag": 0,
            "engagement_score": 1100
        },
        {
            "id": "x_metro_08",
            "platform": "x",
            "author_id": "x_cyber_lawyer",
            "author_name": "Advocate Meera (@MeeraCyberLaw)",
            "content": "Strongly oppose warrantless facial vector collection at metro stations. We object to unapproved surveillance of daily commuters and demand a formal inquiry.",
            "timestamp": (base_t3 + timedelta(hours=4, minutes=45)).isoformat(),
            "parent_id": "x_metro_04",
            "interaction_type": "reply",
            "community_id": 1,
            "narrative_id": n3_id,
            "sentiment": "negative",
            "emotion": "opposition",
            "sarcasm_flag": 0,
            "engagement_score": 1400
        },

        # Community 2: Transit Authority
        {
            "id": "x_metro_09",
            "platform": "x",
            "author_id": "x_metro_rail_official",
            "author_name": "Metro Rail Corporation (@MetroRailOfficial)",
            "content": "OFFICIAL ADVISORY & CLARIFICATION: Metro Rail Corporation confirms the biometric trial is 100% voluntary for opt-in registered passengers only. Standard card and QR gates operate as normal. Commuter privacy is fully protected under strict guidelines.",
            "timestamp": (base_t3 + timedelta(hours=5, minutes=30)).isoformat(),
            "parent_id": "x_metro_04",
            "interaction_type": "reply",
            "community_id": 2,
            "narrative_id": n3_id,
            "sentiment": "positive",
            "emotion": "support",
            "sarcasm_flag": 0,
            "engagement_score": 5200
        }
    ]

    all_raw = n1_raw + n2_raw + n3_raw
    for item in all_raw:
        if item["platform"] == "telegram":
            events.append(normalize_telegram_message(item, narrative_id=item["narrative_id"]))
        else:
            events.append(normalize_x_post(item, narrative_id=item["narrative_id"]))

    return events


def load_seed_data() -> Dict[str, Any]:
    """Clears existing events and loads rich synthetic multi-platform seed data."""
    init_db()
    clear_events()
    events = generate_seed_events()
    insert_events(events)
    logger.info(f"Loaded {len(events)} seed events across 3 distinct narratives.")
    return {
        "status": "success",
        "message": f"Successfully loaded {len(events)} seed events into Social Pulse event store.",
        "events_count": len(events),
        "narratives_count": 3
    }
