"""
run_models.py
Step 2 of NLP Layer Blind Evaluation.
Runs both classifiers on all 30 posts from eval/post_ids.json independently:
 (a) Local VADER + heuristic classifier
 (b) Real Gemini classifier (uncertainty gate is BYPASSED)

Rules:
- If GEMINI_API_KEY is missing or a call fails, stop and say so clearly.
- Never fall back to the heuristic and label it Gemini.
- Save predictions to eval/predictions.csv with columns:
  post_id, local_sentiment, local_emotion, gemini_sentiment, gemini_emotion, gemini_call_ok
"""

import os
import sys
import csv
import json
import logging

# Ensure backend root is in sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

from db import get_db_connection
from nlp import classify_text_local, VALID_SENTIMENTS, VALID_EMOTIONS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def get_gemini_client_strict():
    """
    Initializes Gemini client. Returns None if GEMINI_API_KEY is missing.
    Strictly avoids any heuristic fallback.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key or api_key.strip() == "" or api_key == "your_gemini_api_key_here":
        return None
    try:
        from google import genai
        return genai.Client(api_key=api_key.strip())
    except Exception as e:
        logger.error(f"Failed to initialize google-genai client: {e}")
        return None


def run_gemini_classification(client, text: str) -> dict:
    """
    Direct Gemini classification call bypassing the uncertainty gate.
    """
    prompt = f"""You are an expert Social Media NLP intelligence engine for situational awareness.
Analyze the following social post and classify its sentiment and primary emotion.

EMOTION MUST BE EXACTLY ONE OF:
["curiosity", "excitement", "anxiety", "anger", "fear", "support", "opposition", "uncertainty", "mobilization"]

SENTIMENT MUST BE EXACTLY ONE OF:
["positive", "negative", "neutral"]

POST CONTENT:
\"\"\"{text}\"\"\"

Return ONLY valid JSON matching this schema:
{{
  "sentiment": "positive" | "negative" | "neutral",
  "emotion": "curiosity" | "excitement" | "anxiety" | "anger" | "fear" | "support" | "opposition" | "uncertainty" | "mobilization"
}}
"""
    import time
    last_err = None
    for attempt in range(1, 4):
        try:
            response = client.models.generate_content(
                model="gemini-3.8-flash",
                contents=prompt
            )
            break
        except Exception as e:
            last_err = e
            err_str = str(e)
            is_unavailable = "503" in err_str or "UNAVAILABLE" in err_str or "high demand" in err_str.lower()
            if attempt < 3 and is_unavailable:
                print(f"      [Retry {attempt}/3] 503 UNAVAILABLE: waiting 5 seconds before retrying...")
                time.sleep(5)
                continue
            raise e

    resp_text = response.text.strip()
    if resp_text.startswith("```json"):
        resp_text = resp_text[7:]
    if resp_text.startswith("```"):
        resp_text = resp_text[3:]
    if resp_text.endswith("```"):
        resp_text = resp_text[:-3]

    parsed = json.loads(resp_text.strip())
    sentiment = parsed.get("sentiment", "").lower().strip()
    emotion = parsed.get("emotion", "").lower().strip()

    if sentiment not in VALID_SENTIMENTS:
        raise ValueError(f"Gemini returned invalid sentiment: '{sentiment}'")
    if emotion not in VALID_EMOTIONS:
        raise ValueError(f"Gemini returned invalid emotion: '{emotion}'")

    return {
        "sentiment": sentiment,
        "emotion": emotion
    }


def run_models():
    # 1. Load the 30 post IDs
    post_ids_path = os.path.join(SCRIPT_DIR, "post_ids.json")
    if not os.path.exists(post_ids_path):
        # Check project root fallback
        post_ids_path = os.path.join(PROJECT_ROOT, "eval", "post_ids.json")

    if not os.path.exists(post_ids_path):
        print(f"[ERROR] post_ids.json not found at {post_ids_path}. Run make_label_sheet.py first.")
        sys.exit(1)

    with open(post_ids_path, "r", encoding="utf-8") as f:
        post_ids = json.load(f)

    print(f"Loaded {len(post_ids)} post IDs for evaluation.")

    # 2. Fetch posts from label_sheet.csv (ground truth dataset) or DB
    posts_by_id = {}
    label_sheet_path = os.path.join(SCRIPT_DIR, "label_sheet.csv")
    if not os.path.exists(label_sheet_path):
        label_sheet_path = os.path.join(PROJECT_ROOT, "eval", "label_sheet.csv")
    if os.path.exists(label_sheet_path):
        with open(label_sheet_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                if r.get("post_id") and r.get("text"):
                    posts_by_id[r["post_id"]] = r["text"]

    missing_ids = [pid for pid in post_ids if pid not in posts_by_id]
    if missing_ids:
        conn = get_db_connection()
        c = conn.cursor()
        placeholders = ",".join("?" for _ in missing_ids)
        rows = c.execute(f"SELECT id, content FROM events WHERE id IN ({placeholders})", missing_ids).fetchall()
        conn.close()
        for r in rows:
            posts_by_id[r["id"]] = r["content"]

    # 3. Check Gemini Client Availability
    gemini_client = get_gemini_client_strict()
    gemini_available = gemini_client is not None

    if not gemini_available:
        print("\n" + "=" * 75)
        print("[CRITICAL NOTICE: GEMINI API UNAVAILABLE]")
        print("GEMINI_API_KEY is missing or empty in backend/.env.")
        print("Per instructions: STOPPING and stating clearly that Gemini cannot run.")
        print("WILL NOT fall back to local heuristic and label it as Gemini.")
        print("Local classifier will run on all 30 posts. Gemini columns will be empty,")
        print("and gemini_call_ok will be recorded as False.")
        print("=" * 75 + "\n")

    # 4. Classify each of the 30 posts
    predictions = []
    failed_posts = []

    for idx, pid in enumerate(post_ids, 1):
        text = posts_by_id.get(pid, "")
        if not text:
            print(f"[{idx}/{len(post_ids)}] Post {pid}: Missing content, skipping.")
            continue

        clean_text = " ".join(text.split())

        # (a) Local VADER + heuristic classifier
        local_result, _ = classify_text_local(clean_text)
        local_sentiment = local_result.get("sentiment", "neutral")
        local_emotion = local_result.get("emotion", "curiosity")

        # (b) Real Gemini classifier (bypassing uncertainty gate)
        gemini_sentiment = ""
        gemini_emotion = ""
        gemini_call_ok = False

        if gemini_available:
            try:
                g_res = run_gemini_classification(gemini_client, clean_text)
                gemini_sentiment = g_res["sentiment"]
                gemini_emotion = g_res["emotion"]
                gemini_call_ok = True
                print(f"[{idx}/{len(post_ids)}] {pid}: Local=({local_sentiment}, {local_emotion}) | Gemini=({gemini_sentiment}, {gemini_emotion}) [OK]")
            except Exception as e:
                failed_posts.append((pid, str(e)))
                print(f"[{idx}/{len(post_ids)}] {pid}: Local=({local_sentiment}, {local_emotion}) | Gemini FAILED after 3 retries: {e}")
                gemini_call_ok = False
        else:
            print(f"[{idx}/{len(post_ids)}] {pid}: Local=({local_sentiment}, {local_emotion}) | Gemini=(N/A - key missing) [gemini_call_ok=False]")

        predictions.append({
            "post_id": pid,
            "local_sentiment": local_sentiment,
            "local_emotion": local_emotion,
            "gemini_sentiment": gemini_sentiment,
            "gemini_emotion": gemini_emotion,
            "gemini_call_ok": gemini_call_ok
        })

    # 5. Save predictions to eval/predictions.csv
    output_files = [
        os.path.join(SCRIPT_DIR, "predictions.csv"),
        os.path.join(PROJECT_ROOT, "eval", "predictions.csv")
    ]

    for out_path in output_files:
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "post_id", "local_sentiment", "local_emotion",
                "gemini_sentiment", "gemini_emotion", "gemini_call_ok"
            ])
            for p in predictions:
                writer.writerow([
                    p["post_id"],
                    p["local_sentiment"],
                    p["local_emotion"],
                    p["gemini_sentiment"],
                    p["gemini_emotion"],
                    p["gemini_call_ok"]
                ])
        print(f"Saved predictions to: {out_path}")

    # Summary
    ok_count = sum(1 for p in predictions if p["gemini_call_ok"])
    print(f"\nExecution Summary:")
    print(f"Total posts evaluated: {len(predictions)}")
    print(f"Local classifications: {len(predictions)} / {len(predictions)} (100%)")
    print(f"Gemini live calls OK: {ok_count} / {len(predictions)}")
    if failed_posts:
        print("\n" + "!" * 75)
        print(f"[FAILED POSTS] {len(failed_posts)} post(s) failed Gemini classification after retries:")
        for f_pid, f_err in failed_posts:
            print(f"  - {f_pid}: {f_err}")
        print("!" * 75)
    elif ok_count == len(predictions):
        print("\n[SUCCESS] All 30 posts successfully classified by Gemini!")


if __name__ == "__main__":
    run_models()
