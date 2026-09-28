"""
label_tool.py
Interactive Blind Labeling Tool for Social Pulse AI NLP Layer Evaluation.
Runs directly in the terminal with zero external dependencies.

Features:
- Reads the primary label_sheet.csv (backend/eval/label_sheet.csv) and mirrors to eval/label_sheet.csv.
- Displays one post at a time: index (e.g. 7/30), channel, and full post text.
- Never accesses predictions.csv or displays model outputs (100% blind).
- Single-key sentiment selection:
    p = positive
    n = negative
    u = neutral
- Numbered emotion selection:
    1 = curiosity
    2 = excitement
    3 = anxiety
    4 = anger
    5 = fear
    6 = support
    7 = opposition
    8 = uncertainty
    9 = mobilization
- Navigation & Control:
    b = go back and edit previous post
    s = skip current post for now
    q = quit immediately (all prior entries already saved)
- Saves immediately after each post in UTF-8 format to ensure emoji/text preservation.
- Resumes automatically at the first unlabeled post upon restart.
- On completion: prints exact label counts and verifies no blank cells remain.
"""

import os
import sys
import csv
import shutil
from collections import Counter

# Ensure terminal stdout handles emoji and Unicode on Windows console safely
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

PRIMARY_SHEET = os.path.join(SCRIPT_DIR, "label_sheet.csv")
MIRROR_SHEET = os.path.join(PROJECT_ROOT, "eval", "label_sheet.csv")

SENTIMENT_MAP = {
    "p": "positive",
    "n": "negative",
    "u": "neutral"
}

EMOTION_MAP = {
    "1": "curiosity",
    "2": "excitement",
    "3": "anxiety",
    "4": "anger",
    "5": "fear",
    "6": "support",
    "7": "opposition",
    "8": "uncertainty",
    "9": "mobilization"
}


def load_sheet(file_path):
    if not os.path.exists(file_path):
        print(f"[ERROR] Label sheet not found at: {file_path}")
        sys.exit(1)
    with open(file_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)
    return fieldnames, rows


def save_sheet(file_path, fieldnames, rows, mirror_path=None):
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    if mirror_path and mirror_path != file_path:
        os.makedirs(os.path.dirname(mirror_path), exist_ok=True)
        shutil.copyfile(file_path, mirror_path)


def run_labeling(primary_file=None, mirror_file=None):
    primary_path = primary_file or PRIMARY_SHEET
    mirror_path = mirror_file or MIRROR_SHEET

    fieldnames, rows = load_sheet(primary_path)
    total_posts = len(rows)

    if total_posts == 0:
        print("[ERROR] Label sheet contains 0 posts.")
        return

    # Find first unlabeled post to resume
    current_idx = 0
    for idx, r in enumerate(rows):
        h_sent = (r.get("human_sentiment") or "").strip()
        h_emot = (r.get("human_emotion") or "").strip()
        if not h_sent or not h_emot:
            current_idx = idx
            break
    else:
        # All labeled already
        print(f"\n[NOTICE] All {total_posts} posts are already labeled.")
        choice = input("Do you want to review/edit from post 1? (y/n): ").strip().lower()
        if choice != "y":
            print_summary(rows)
            return
        current_idx = 0

    print("\n" + "=" * 70)
    print("      SOCIAL PULSE AI - BLIND NLP LABELING TOOL")
    print("=" * 70)
    print("Commands at any prompt:")
    print("  b = go back to previous post")
    print("  s = skip current post for now")
    print("  q = save and quit")
    print("=" * 70 + "\n")

    while 0 <= current_idx < total_posts:
        post = rows[current_idx]
        post_num = current_idx + 1
        pid = post.get("post_id", f"post_{post_num}")
        channel = post.get("channel", "unknown")
        text = post.get("text", "")
        existing_sent = (post.get("human_sentiment") or "").strip()
        existing_emot = (post.get("human_emotion") or "").strip()

        print("-" * 70)
        print(f"POST {post_num}/{total_posts}  [ID: {pid} | Channel: @{channel}]")
        if existing_sent and existing_emot:
            print(f"(Current labels: sentiment='{existing_sent}', emotion='{existing_emot}')")
        print("-" * 70)
        print(f"\n\"{text}\"\n")
        print("-" * 70)

        # 1. Ask Sentiment
        sentiment_val = None
        while True:
            sent_prompt = "Sentiment [p = positive, n = negative, u = neutral | b, s, q]: "
            s_input = input(sent_prompt).strip().lower()

            if s_input == "q":
                print("\n[Exiting] Progress has been saved to disk. Goodbye!")
                return
            elif s_input == "b":
                if current_idx > 0:
                    current_idx -= 1
                    break
                else:
                    print("[Cannot go back: currently at the first post]")
                    continue
            elif s_input == "s":
                current_idx += 1
                break
            elif s_input in SENTIMENT_MAP:
                sentiment_val = SENTIMENT_MAP[s_input]
                break
            else:
                print(">>> Invalid input! Enter 'p', 'n', 'u', or 'b'/'s'/'q'.")

        if s_input in ["b", "s"]:
            continue

        # 2. Ask Emotion
        emotion_val = None
        print("\nEmotions:")
        print("  1 = curiosity      2 = excitement     3 = anxiety")
        print("  4 = anger          5 = fear           6 = support")
        print("  7 = opposition     8 = uncertainty    9 = mobilization")
        
        while True:
            e_input = input("Emotion [1-9 | b, s, q]: ").strip().lower()

            if e_input == "q":
                print("\n[Exiting] Progress has been saved to disk. Goodbye!")
                return
            elif e_input == "b":
                # Re-ask sentiment for this post
                sentiment_val = None
                break
            elif e_input == "s":
                current_idx += 1
                break
            elif e_input in EMOTION_MAP:
                emotion_val = EMOTION_MAP[e_input]
                break
            else:
                print(">>> Invalid input! Enter a digit 1-9, or 'b'/'s'/'q'.")

        if e_input == "b":
            continue
        if e_input == "s":
            continue

        # 3. Save post to memory & disk immediately
        post["human_sentiment"] = sentiment_val
        post["human_emotion"] = emotion_val
        save_sheet(primary_path, fieldnames, rows, mirror_path)

        print(f"\n--> Saved: sentiment='{sentiment_val}', emotion='{emotion_val}'")
        current_idx += 1

    # End of list
    print_summary(rows)


def print_summary(rows):
    total = len(rows)
    blank_sent = sum(1 for r in rows if not (r.get("human_sentiment") or "").strip())
    blank_emot = sum(1 for r in rows if not (r.get("human_emotion") or "").strip())

    sent_counts = Counter((r.get("human_sentiment") or "").strip().lower() for r in rows)
    emot_counts = Counter((r.get("human_emotion") or "").strip().lower() for r in rows)

    print("\n" + "=" * 70)
    print("                     LABELING COMPLETE SUMMARY")
    print("=" * 70)
    print(f"Total Posts Evaluated: {total}")
    
    print("\nSentiment Distribution:")
    for s in ["positive", "negative", "neutral"]:
        print(f"  • {s:<12}: {sent_counts.get(s, 0)}")

    print("\nEmotion Distribution:")
    for e in [
        "curiosity", "excitement", "anxiety", "anger",
        "fear", "support", "opposition", "uncertainty", "mobilization"
    ]:
        print(f"  • {e:<14}: {emot_counts.get(e, 0)}")

    print("-" * 70)
    if blank_sent == 0 and blank_emot == 0:
        print("[STATUS] SUCCESS: All 30 posts are fully labeled with ZERO blank cells!")
        print("Ready to run backend/eval/score.py.")
    else:
        print(f"[STATUS] WARNING: {blank_sent} posts have blank sentiment, {blank_emot} have blank emotion.")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    run_labeling()
