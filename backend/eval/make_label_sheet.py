"""
make_label_sheet.py
Step 1 of NLP Layer Blind Evaluation.
Pulls 30 real posts from live Telegram ingestion (sample_data = 0),
stratified across channels so no channel supplies more than 10.
Filters out:
 - Posts under 5 words
 - Posts that are only links or forwards
Exports:
 - eval/label_sheet.csv (post_id, channel, text, human_sentiment, human_emotion)
 - eval/post_ids.json (list of the 30 post IDs for reproducibility)
"""

import os
import re
import csv
import json
import sqlite3
import sys

# Ensure backend root is in sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from telegram_service import ingest_live_telegram_stream, DEFAULT_PUBLIC_CHANNELS
from db import get_db_connection

def is_valid_post(text: str, interaction_type: str = "") -> bool:
    """Validates criteria: >=5 words, not link-only, not forward."""
    if not text:
        return False
    words = text.split()
    if len(words) < 5:
        return False
    
    # Check if purely/mostly links
    non_url = re.sub(r"https?://\S+", "", text).strip()
    if len(non_url.split()) < 4:
        return False
        
    # Check if forward
    if interaction_type == "forward":
        return False
    text_lower = text.lower()
    if text_lower.startswith("forwarded from") or "forwarded from" in text_lower[:30]:
        return False
        
    return True

def ensure_live_posts_in_db():
    """Ensures at least 30 live Telegram events exist in social_pulse.db."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM events WHERE (sample_data = 0 OR sample_data IS FALSE) AND id LIKE 'tg_live_%'")
    count = c.fetchone()[0]
    conn.close()

    if count < 30:
        print(f"Current live Telegram events in DB: {count}. Ingesting live stream from {DEFAULT_PUBLIC_CHANNELS}...")
        ingest_live_telegram_stream(channels=DEFAULT_PUBLIC_CHANNELS, max_per_channel=20)
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM events WHERE (sample_data = 0 OR sample_data IS FALSE) AND id LIKE 'tg_live_%'")
        count = c.fetchone()[0]
        conn.close()
        print(f"Total live Telegram events after ingestion: {count}")

def make_label_sheet():
    ensure_live_posts_in_db()

    conn = get_db_connection()
    c = conn.cursor()
    rows = c.execute("""
        SELECT id, author_id, content, interaction_type, raw_metadata
        FROM events
        WHERE (sample_data = 0 OR sample_data IS FALSE) AND id LIKE 'tg_live_%'
        ORDER BY timestamp DESC, id DESC
    """).fetchall()
    conn.close()

    # Known spot-check IDs from earlier evaluation to prioritize if present
    SPOT_CHECK_IDS = {
        "tg_live_durov_539", "tg_live_worldnews_77925", "tg_live_worldnews_77924",
        "tg_live_worldnews_77921", "tg_live_worldnews_77923", "tg_live_worldnews_77919",
        "tg_live_worldnews_77916", "tg_live_telegram_42"
    }

    # Group valid candidates by channel
    channel_candidates = {}
    for r in rows:
        post_id = r["id"]
        content = r["content"]
        itype = r["interaction_type"]
        meta = json.loads(r["raw_metadata"]) if r["raw_metadata"] else {}
        channel = meta.get("channel") or (r["author_id"].lstrip("@") if r["author_id"] else "")
        
        # Fallback channel extraction from post_id 'tg_live_{channel}_{msg_id}'
        if not channel and post_id.startswith("tg_live_"):
            parts = post_id.split("_")
            if len(parts) >= 3:
                channel = parts[2]

        if not is_valid_post(content, itype):
            continue

        clean_text = " ".join(content.split())
        channel_candidates.setdefault(channel, []).append({
            "post_id": post_id,
            "channel": channel,
            "text": clean_text
        })

    print(f"Valid candidates per channel:")
    for ch, items in channel_candidates.items():
        print(f"  @{ch}: {len(items)} posts")

    # Stratified selection: Target 30 total, max 10 per channel
    # Available channels typically: durov, worldnews, telegram, tginfoen
    channels = sorted(list(channel_candidates.keys()))
    selected_posts = []
    
    # Target allocations across channels
    target_allocations = {
        "durov": 8,
        "worldnews": 8,
        "telegram": 7,
        "tginfoen": 7
    }

    # First pass: Allocate according to target allocations, prioritizing spot check posts
    for ch in channels:
        target_count = target_allocations.get(ch, 7)
        posts = channel_candidates.get(ch, [])
        # Put spot check posts first if available
        posts_sorted = sorted(posts, key=lambda p: 0 if p["post_id"] in SPOT_CHECK_IDS else 1)
        selected_for_ch = posts_sorted[:target_count]
        selected_posts.extend(selected_for_ch)

    # If count is not 30 (due to channel distribution), balance up to 30 with max 10 per channel
    channel_counts = {}
    for p in selected_posts:
        channel_counts[p["channel"]] = channel_counts.get(p["channel"], 0) + 1

    selected_ids = {p["post_id"] for p in selected_posts}

    if len(selected_posts) < 30:
        for ch in channels:
            for p in channel_candidates[ch]:
                if len(selected_posts) >= 30:
                    break
                if p["post_id"] not in selected_ids and channel_counts.get(ch, 0) < 10:
                    selected_posts.append(p)
                    selected_ids.add(p["post_id"])
                    channel_counts[ch] = channel_counts.get(ch, 0) + 1

    # Ensure strictly 30 posts
    selected_posts = selected_posts[:30]

    # Verify constraints
    print(f"\nSelected {len(selected_posts)} posts:")
    final_counts = {}
    for p in selected_posts:
        final_counts[p["channel"]] = final_counts.get(p["channel"], 0) + 1
    for ch, count in final_counts.items():
        print(f"  Channel @{ch}: {count} posts (Constraint <= 10: {count <= 10})")
        assert count <= 10, f"Channel {ch} has {count} posts, exceeding limit of 10!"

    assert len(selected_posts) == 30, f"Expected 30 posts, got {len(selected_posts)}"

    # Export label_sheet.csv
    # Columns: post_id, channel, text, human_sentiment, human_emotion
    # Must NOT contain any model predictions, sentiment, or emotion columns!
    output_files = [
        os.path.join(SCRIPT_DIR, "label_sheet.csv"),
        os.path.join(PROJECT_ROOT, "eval", "label_sheet.csv")
    ]
    post_id_files = [
        os.path.join(SCRIPT_DIR, "post_ids.json"),
        os.path.join(PROJECT_ROOT, "eval", "post_ids.json")
    ]

    for out_path in output_files:
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["post_id", "channel", "text", "human_sentiment", "human_emotion"])
            for p in selected_posts:
                # Leave human_sentiment and human_emotion completely blank
                writer.writerow([p["post_id"], p["channel"], p["text"], "", ""])
        print(f"Exported label sheet: {out_path}")

    # Export post_ids.json
    post_ids_list = [p["post_id"] for p in selected_posts]
    for p_path in post_id_files:
        os.makedirs(os.path.dirname(p_path), exist_ok=True)
        with open(p_path, "w", encoding="utf-8") as f:
            json.dump(post_ids_list, f, indent=2)
        print(f"Exported post IDs: {p_path}")

    # Check for spot check post presence
    spot_overlap = [pid for pid in post_ids_list if pid in SPOT_CHECK_IDS]
    print(f"\nSpot-check overlap in 30 posts: {spot_overlap}")

if __name__ == "__main__":
    make_label_sheet()
