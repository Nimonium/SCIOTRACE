"""
score.py
Step 3 of NLP Layer Blind Evaluation.
Scores both classifiers against human labels provided in eval/label_sheet.csv.

Rules:
- Refuse to run if any human_sentiment or human_emotion cell is blank.
- Report separately for Local and Gemini:
  * Sentiment accuracy
  * Emotion accuracy
  * Confusion matrix for sentiment
  * Detailed list of misclassified posts with full text
- Report the 8 posts from the earlier spot-check (if in the 30) as before/after.
- Print sample size next to every single metric.
- Include one-line note: With n=30, the margin of error is roughly ±15 percentage points.
"""

import os
import sys
import csv
import json
from collections import defaultdict

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

SENTIMENTS = ["positive", "negative", "neutral"]
EMOTIONS = [
    "curiosity", "excitement", "anxiety", "anger",
    "fear", "support", "opposition", "uncertainty", "mobilization"
]

# The 8 historical spot-check posts evaluated in the prior engineering pass
HISTORICAL_SPOT_CHECK = {
    "tg_live_worldnews_77925": {"sentiment": "negative", "emotion": "anger"},
    "tg_live_worldnews_77924": {"sentiment": "negative", "emotion": "mobilization"},
    "tg_live_worldnews_77921": {"sentiment": "neutral", "emotion": "curiosity"},
    "tg_live_worldnews_77923": {"sentiment": "negative", "emotion": "curiosity"},
    "tg_live_worldnews_77919": {"sentiment": "negative", "emotion": "curiosity"},
    "tg_live_worldnews_77916": {"sentiment": "positive", "emotion": "curiosity"},
    "tg_live_durov_539": {"sentiment": "positive", "emotion": "mobilization"},
    "tg_live_telegram_42": {"sentiment": "positive", "emotion": "support"},
}


def load_csv(path):
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def print_confusion_matrix(matrix, labels, title):
    print(f"\n--- {title} ---")
    header = f"{'Actual \\ Pred':<15}" + "".join(f"{l:<12}" for l in labels) + f"{'Total':<8}"
    print(header)
    print("-" * len(header))
    for actual in labels:
        row_str = f"{actual:<15}"
        row_sum = sum(matrix[actual][pred] for pred in labels)
        for pred in labels:
            row_str += f"{matrix[actual][pred]:<12}"
        row_str += f"{row_sum:<8}"
        print(row_str)
    print("-" * len(header))


def score():
    # 1. Locate files
    label_paths = [
        os.path.join(SCRIPT_DIR, "label_sheet.csv"),
        os.path.join(PROJECT_ROOT, "eval", "label_sheet.csv")
    ]
    pred_paths = [
        os.path.join(SCRIPT_DIR, "predictions.csv"),
        os.path.join(PROJECT_ROOT, "eval", "predictions.csv")
    ]

    labels_data = None
    for lp in label_paths:
        labels_data = load_csv(lp)
        if labels_data:
            break

    preds_data = None
    for pp in pred_paths:
        preds_data = load_csv(pp)
        if preds_data:
            break

    if not labels_data:
        print("[ERROR] label_sheet.csv not found in backend/eval or eval/. Run make_label_sheet.py first.")
        sys.exit(1)

    if not preds_data:
        print("[ERROR] predictions.csv not found in backend/eval or eval/. Run run_models.py first.")
        sys.exit(1)

    preds_by_id = {r["post_id"]: r for r in preds_data}

    # 2. Strict validation: REFUSE to run if any label is blank
    blank_errors = []
    for idx, row in enumerate(labels_data, 1):
        pid = row.get("post_id", f"row_{idx}")
        h_sent = (row.get("human_sentiment") or "").strip().lower()
        h_emot = (row.get("human_emotion") or "").strip().lower()

        if not h_sent or not h_emot:
            missing = []
            if not h_sent:
                missing.append("human_sentiment")
            if not h_emot:
                missing.append("human_emotion")
            blank_errors.append(f"  - Post ID {pid} (Row {idx}): Missing {', '.join(missing)}")

    if blank_errors:
        print("\n" + "=" * 80)
        print("[REFUSAL: INCOMPLETE LABEL SHEET]")
        print("Cannot score models: Blank human label cells were detected in label_sheet.csv.")
        print(f"Total incomplete rows: {len(blank_errors)} / {len(labels_data)}")
        print("\nDetails of incomplete rows:")
        for err in blank_errors[:10]:
            print(err)
        if len(blank_errors) > 10:
            print(f"  ... and {len(blank_errors) - 10} more.")
        print("\nPlease fill in both 'human_sentiment' and 'human_emotion' for all 30 posts before scoring.")
        print("=" * 80 + "\n")
        sys.exit(1)

    # 3. Model evaluation
    n_total = len(labels_data)
    print(f"\n================================================================================")
    print(f"                 NLP EVALUATION REPORT (Sample Size: n={n_total})")
    print(f"================================================================================\n")

    # (a) Local Model Scoring
    local_sent_correct = 0
    local_emot_correct = 0
    local_sent_matrix = defaultdict(lambda: defaultdict(int))
    local_errors = []

    for row in labels_data:
        pid = row["post_id"]
        h_sent = row["human_sentiment"].strip().lower()
        h_emot = row["human_emotion"].strip().lower()
        p_row = preds_by_id.get(pid, {})
        l_sent = p_row.get("local_sentiment", "").strip().lower()
        l_emot = p_row.get("local_emotion", "").strip().lower()

        local_sent_matrix[h_sent][l_sent] += 1
        sent_match = (h_sent == l_sent)
        emot_match = (h_emot == l_emot)

        if sent_match:
            local_sent_correct += 1
        if emot_match:
            local_emot_correct += 1

        if not sent_match or not emot_match:
            local_errors.append({
                "post_id": pid,
                "channel": row.get("channel", ""),
                "human_sent": h_sent,
                "pred_sent": l_sent,
                "sent_ok": sent_match,
                "human_emot": h_emot,
                "pred_emot": l_emot,
                "emot_ok": emot_match,
                "text": row.get("text", "")
            })

    local_sent_acc = (local_sent_correct / n_total) * 100
    local_emot_acc = (local_emot_correct / n_total) * 100

    print("--------------------------------------------------------------------------------")
    print("1. LOCAL CLASSIFIER (VADER + Heuristic Lexicon)")
    print("--------------------------------------------------------------------------------")
    print(f"• Sentiment Accuracy: {local_sent_acc:.1f}% ({local_sent_correct}/{n_total}, n={n_total})")
    print(f"• Emotion Accuracy:   {local_emot_acc:.1f}% ({local_emot_correct}/{n_total}, n={n_total})")

    print_confusion_matrix(local_sent_matrix, SENTIMENTS, f"Local Model Sentiment Confusion Matrix (n={n_total})")

    print(f"\nLocal Model Errors ({len(local_errors)} of {n_total} posts misclassified, n={n_total}):")
    for i, err in enumerate(local_errors, 1):
        s_tag = "✓" if err["sent_ok"] else f"✗ (Pred: {err['pred_sent']} | True: {err['human_sent']})"
        e_tag = "✓" if err["emot_ok"] else f"✗ (Pred: {err['pred_emot']} | True: {err['human_emot']})"
        print(f"\n[{i}] {err['post_id']} (@{err['channel']})")
        print(f"    Sentiment: {s_tag}")
        print(f"    Emotion:   {e_tag}")
        print(f"    Text: \"{err['text']}\"")

    # (b) Gemini Model Scoring
    gemini_posts = [r for r in labels_data if preds_by_id.get(r["post_id"], {}).get("gemini_call_ok") in ["True", True]]
    n_gemini = len(gemini_posts)

    print("\n" + "=" * 80)
    print("2. GEMINI CLASSIFIER (Live LLM, Uncertainty Gate Bypassed)")
    print("=" * 80)

    if n_gemini == 0:
        print(f"[UNAVAILABLE] 0 live Gemini predictions recorded (n=0 of {n_total}).")
        print("GEMINI_API_KEY was not configured or calls failed during run_models.py.")
        print("Per instructions, offline heuristics were NOT used as a Gemini substitute.")
    else:
        gemini_sent_correct = 0
        gemini_emot_correct = 0
        gemini_sent_matrix = defaultdict(lambda: defaultdict(int))
        gemini_errors = []

        for row in gemini_posts:
            pid = row["post_id"]
            h_sent = row["human_sentiment"].strip().lower()
            h_emot = row["human_emotion"].strip().lower()
            p_row = preds_by_id.get(pid, {})
            g_sent = p_row.get("gemini_sentiment", "").strip().lower()
            g_emot = p_row.get("gemini_emotion", "").strip().lower()

            gemini_sent_matrix[h_sent][g_sent] += 1
            sent_match = (h_sent == g_sent)
            emot_match = (h_emot == g_emot)

            if sent_match:
                gemini_sent_correct += 1
            if emot_match:
                gemini_emot_correct += 1

            if not sent_match or not emot_match:
                gemini_errors.append({
                    "post_id": pid,
                    "channel": row.get("channel", ""),
                    "human_sent": h_sent,
                    "pred_sent": g_sent,
                    "sent_ok": sent_match,
                    "human_emot": h_emot,
                    "pred_emot": g_emot,
                    "emot_ok": emot_match,
                    "text": row.get("text", "")
                })

        gemini_sent_acc = (gemini_sent_correct / n_gemini) * 100
        gemini_emot_acc = (gemini_emot_correct / n_gemini) * 100

        print(f"• Sentiment Accuracy: {gemini_sent_acc:.1f}% ({gemini_sent_correct}/{n_gemini}, n={n_gemini})")
        print(f"• Emotion Accuracy:   {gemini_emot_acc:.1f}% ({gemini_emot_correct}/{n_gemini}, n={n_gemini})")

        print_confusion_matrix(gemini_sent_matrix, SENTIMENTS, f"Gemini Sentiment Confusion Matrix (n={n_gemini})")

        print(f"\nGemini Errors ({len(gemini_errors)} of {n_gemini} posts misclassified, n={n_gemini}):")
        for i, err in enumerate(gemini_errors, 1):
            s_tag = "✓" if err["sent_ok"] else f"✗ (Pred: {err['pred_sent']} | True: {err['human_sent']})"
            e_tag = "✓" if err["emot_ok"] else f"✗ (Pred: {err['pred_emot']} | True: {err['human_emot']})"
            print(f"\n[{i}] {err['post_id']} (@{err['channel']})")
            print(f"    Sentiment: {s_tag}")
            print(f"    Emotion:   {e_tag}")
            print(f"    Text: \"{err['text']}\"")

    # 4. Spot-Check Overlap (Before / After Comparison)
    print("\n" + "=" * 80)
    print("3. HISTORICAL SPOT-CHECK POSTS OVERLAP (BEFORE / AFTER)")
    print("=" * 80)
    overlapping_ids = [r["post_id"] for r in labels_data if r["post_id"] in HISTORICAL_SPOT_CHECK]

    if not overlapping_ids:
        print(f"None of the 8 earlier spot-check posts were in this 30-post sample (Checked {len(HISTORICAL_SPOT_CHECK)} historical IDs, n=0).")
    else:
        print(f"Found {len(overlapping_ids)} of 8 earlier spot-check posts in the evaluation set (n={len(overlapping_ids)}):")
        for pid in overlapping_ids:
            row = next(r for r in labels_data if r["post_id"] == pid)
            p_row = preds_by_id.get(pid, {})
            prior = HISTORICAL_SPOT_CHECK[pid]
            h_sent = row["human_sentiment"].strip().lower()
            h_emot = row["human_emotion"].strip().lower()
            l_sent = p_row.get("local_sentiment", "")
            l_emot = p_row.get("local_emotion", "")
            g_sent = p_row.get("gemini_sentiment", "") or "N/A"
            g_emot = p_row.get("gemini_emotion", "") or "N/A"

            print(f"\n• Post ID: {pid} (@{row.get('channel')})")
            print(f"  - Human True Label:     Sentiment='{h_sent}', Emotion='{h_emot}'")
            print(f"  - Prior Spot-Check Run: Sentiment='{prior['sentiment']}', Emotion='{prior['emotion']}'")
            print(f"  - Current Local Run:    Sentiment='{l_sent}', Emotion='{l_emot}'")
            print(f"  - Current Gemini Run:   Sentiment='{g_sent}', Emotion='{g_emot}'")
            print(f"  - Text: \"{row.get('text')}\"")

    # 5. Statistical Margin of Error Note
    print("\n" + "=" * 80)
    print("STATISTICAL NOTE:")
    print(f"With n={n_total}, the margin of error is roughly plus or minus 15 percentage points (±15% at 95% confidence level).")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    score()
