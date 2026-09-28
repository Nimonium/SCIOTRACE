"""
Database module for Social Pulse AI.
Provides SQLite database schema and connection utilities.
"""

import sqlite3
import os
import json
from typing import List, Dict, Any, Optional

raw_db_path = os.environ.get("SQLITE_DB_PATH", "social_pulse.db")
if not os.path.isabs(raw_db_path):
    DB_PATH = os.path.normpath(os.path.join(os.path.dirname(__file__), raw_db_path))
else:
    DB_PATH = raw_db_path


def get_db_connection() -> sqlite3.Connection:
    """Returns a connection to the SQLite database with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes the database schema if tables do not exist."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Core event table as per project specifications
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            platform TEXT NOT NULL,
            author_id TEXT NOT NULL,
            author_name TEXT,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            parent_id TEXT,
            interaction_type TEXT DEFAULT 'post',
            community_id INTEGER,
            narrative_id TEXT,
            sentiment TEXT,
            emotion TEXT,
            sarcasm_flag INTEGER DEFAULT 0,
            engagement_score INTEGER DEFAULT 0,
            raw_metadata TEXT,
            topics TEXT,
            entities TEXT
        )
    """)

    # Safe additive schema migration if table already exists
    try:
        cursor.execute("ALTER TABLE events ADD COLUMN topics TEXT")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE events ADD COLUMN entities TEXT")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE events ADD COLUMN sample_data INTEGER DEFAULT 1")
    except Exception:
        pass

    # Indexes for fast querying
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_narrative ON events(narrative_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_author ON events(author_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_parent ON events(parent_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_platform ON events(platform)")

    conn.commit()
    conn.close()


def insert_events(events: List[Dict[str, Any]]):
    """Inserts or replaces a list of normalized events."""
    conn = get_db_connection()
    cursor = conn.cursor()

    prepared = []
    for ev in events:
        item = dict(ev)
        # Ensure topics & entities are serialized to JSON string if present
        if isinstance(item.get("topics"), list):
            item["topics"] = json.dumps(item["topics"])
        elif "topics" not in item:
            item["topics"] = "[]"

        if isinstance(item.get("entities"), list):
            item["entities"] = json.dumps(item["entities"])
        elif "entities" not in item:
            item["entities"] = "[]"

        # Explicitly tag sample_data vs live data
        if "sample_data" in item:
            item["sample_data"] = 1 if item["sample_data"] else 0
        else:
            # Default: X/Twitter is always sample_data; live telegram events tag sample_data=False
            item["sample_data"] = 1 if item.get("platform") in ["x", "twitter"] else 0

        prepared.append(item)

    cursor.executemany("""
        INSERT OR REPLACE INTO events (
            id, platform, author_id, author_name, content, timestamp,
            parent_id, interaction_type, community_id, narrative_id,
            sentiment, emotion, sarcasm_flag, engagement_score, raw_metadata,
            topics, entities, sample_data
        ) VALUES (
            :id, :platform, :author_id, :author_name, :content, :timestamp,
            :parent_id, :interaction_type, :community_id, :narrative_id,
            :sentiment, :emotion, :sarcasm_flag, :engagement_score, :raw_metadata,
            :topics, :entities, :sample_data
        )
    """, prepared)

    conn.commit()
    conn.close()


def _format_event_row(row: sqlite3.Row) -> Dict[str, Any]:
    """Helper to convert a sqlite3.Row into dict and parse JSON fields."""
    d = dict(row)
    if "topics" in d and isinstance(d["topics"], str):
        try:
            d["topics"] = json.loads(d["topics"])
        except Exception:
            d["topics"] = [t.strip() for t in d["topics"].split(",") if t.strip()]
    if "entities" in d and isinstance(d["entities"], str):
        try:
            d["entities"] = json.loads(d["entities"])
        except Exception:
            d["entities"] = [e.strip() for e in d["entities"].split(",") if e.strip()]
    if "sample_data" in d:
        d["sample_data"] = bool(d["sample_data"])
    else:
        d["sample_data"] = bool(d.get("platform") in ["x", "twitter"])
    return d


def fetch_all_events() -> List[Dict[str, Any]]:
    """Fetches all events ordered by timestamp."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM events ORDER BY timestamp ASC")
    rows = [_format_event_row(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def fetch_events_by_narrative(narrative_id: str) -> List[Dict[str, Any]]:
    """Fetches all events for a given narrative ID ordered by timestamp."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM events WHERE narrative_id = ? ORDER BY timestamp ASC", (narrative_id,))
    rows = [_format_event_row(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def fetch_all_narrative_ids() -> List[str]:
    """Returns a distinct list of narrative IDs."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT narrative_id FROM events WHERE narrative_id IS NOT NULL AND narrative_id != ''")
    rows = [row["narrative_id"] for row in cursor.fetchall()]
    conn.close()
    return rows


def update_event_nlp(
    event_id: str,
    sentiment: str,
    emotion: str,
    sarcasm_flag: bool,
    topics: Optional[List[str]] = None,
    entities: Optional[List[str]] = None
):
    """Updates NLP analysis results (sentiment, emotion, sarcasm, topics, entities) for an event."""
    conn = get_db_connection()
    cursor = conn.cursor()
    topics_json = json.dumps(topics) if isinstance(topics, list) else (topics or "[]")
    entities_json = json.dumps(entities) if isinstance(entities, list) else (entities or "[]")

    cursor.execute("""
        UPDATE events
        SET sentiment = ?, emotion = ?, sarcasm_flag = ?, topics = ?, entities = ?
        WHERE id = ?
    """, (sentiment, emotion, 1 if sarcasm_flag else 0, topics_json, entities_json, event_id))
    conn.commit()
    conn.close()


def update_event_community(event_id: str, community_id: int):
    """Updates the detected community ID for an event."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE events SET community_id = ? WHERE id = ?", (community_id, event_id))
    conn.commit()
    conn.close()


def clear_events():
    """Clears all events from the table."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM events")
    conn.commit()
    conn.close()


def reset_database_to_seed():
    """
    Clears all live-ingested events and non-seed events from SQLite database.
    Ensures only the 3 canonical seeded narratives remain.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        DELETE FROM events 
        WHERE sample_data = 0 
           OR narrative_id NOT IN ('narrative-policy-fee-hike', 'narrative-surge-surcharge', 'narrative-metro-ai-pilot')
    """)
    conn.commit()
    conn.close()

