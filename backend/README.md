# 🛰️ Social Pulse AI — Backend

> **NTRO Problem Statement 26152: Social Media Analytics (SIH Hackathon)**  
> Real-time situational awareness engine for multi-platform narrative tracking, momentum forecasting, Louvain community graph analytics, and AI-grounded Q&A.

---

## ⚡ Tech Stack

- **Framework**: Python 3.10+, FastAPI, Uvicorn, Pydantic v2
- **Event Store**: SQLite (`social_pulse.db`)
- **Graph & Communities**: NetworkX (`louvain_communities`, `betweenness_centrality`, `degree_centrality`)
- **NLP & LLM**: Google Gemini API (`google-genai` / `gemini-3.5-flash`) with high-fidelity offline heuristic fallbacks
- **Data Ingestion**: Telegram & X (Twitter) normalizers + synthetic multi-platform seed narrative generator

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment (Optional)
```bash
cp .env.example .env
# Set GEMINI_API_KEY in .env if you want live LLM calls, otherwise works 100% offline out-of-the-box!
```

### 3. Run Backend Server
```bash
python main.py
# or
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation will be available at: **[http://localhost:8000/docs](http://localhost:8000/docs)**

---

## 🧪 Testing

Run automated unit and integration tests covering all 6 stages and API contracts:
```bash
pytest -v
```

---

## 📡 Fixed API Endpoints & Contract

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Service health status |
| `POST` | `/api/v1/ingest/seed` | Loads coherent multi-platform seed data for demo |
| `GET` | `/api/v1/narratives` | Narrative cards with momentum scores, breakout probability & spread path |
| `GET` | `/api/v1/narratives/{id}` | Narrative DNA (origin, mutation frames across communities, triggers, forecast) |
| `GET` | `/api/v1/narratives/{id}/timeline` | Chronological events and emotion distribution series over time |
| `GET` | `/api/v1/narratives/{id}/network` | NetworkX graph nodes with roles (`originator`, `bridge`, `authority`, `amplifier`) & edges |
| `GET` | `/api/v1/trends` | Trend momentum curves, state (`dormant` to `viral`), & breakout risk |
| `GET` | `/api/v1/alerts` | Prioritized situational alerts (`critical`, `accelerating`, `emerging`) |
| `POST` | `/api/v1/ask` | Natural language Q&A grounded on narrative facts (`{query: string}`) |
| `GET` | `/api/v1/demographics/{narrative_id}` | Aggregate demographic distributions, languages, regions, and tribes |

---

## 🏗️ Architecture & Modules

```
Social Pulse AI/
├── main.py           # FastAPI app, CORS middleware, routes, startup lifespan
├── db.py             # SQLite event store, schema, indexing & CRUD
├── ingest.py         # Telegram/X normalizers and realistic seed narrative generator
├── nlp.py            # Gemini sentiment/emotion/sarcasm classifier + fallback
├── trends.py         # Momentum scoring (0-100), state mapping & alert engine
├── graph.py          # NetworkX interaction graph, Louvain detection & influence roles
├── narrative.py      # Narrative DNA builder, timeline series & demographic profiles
├── ask_service.py    # Intent parsing, structured grounding & Gemini Q&A
├── test_app.py       # Pytest test suite for end-to-end endpoint verification
└── requirements.txt  # Python package dependencies
```
