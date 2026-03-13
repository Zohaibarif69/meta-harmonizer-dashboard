# Technical Architecture

**Project:** MetaHarmonizer — Automated Clinical Metadata Harmonization Dashboard  
**GSoC 2026 · Issue #136 · cBioPortal**

---

## System Overview

MetaHarmonizer is a three-tier web application that automates the mapping of raw clinical metadata columns to a curated standard schema. It combines a machine-learning cascade mapper with a human-in-the-loop curator interface and a REST API backend.

```
┌──────────────────────────────────────────────────────┐
│              React Frontend  (port 3000)             │
│  Home · Analytics Dashboard · Curator Workflow       │
└─────────────────────┬────────────────────────────────┘
                      │  HTTP / REST  (CORS)
┌─────────────────────▼────────────────────────────────┐
│              FastAPI Backend  (port 8000)             │
│  /api/health · /api/metrics · /api/mapper            │
│  /api/curator  ·  async job queue  ·  request-ID MW  │
└──────────┬───────────────────────────┬───────────────┘
           │                           │
┌──────────▼──────────┐   ┌────────────▼──────────────┐
│   SchemaMapEngine   │   │   SQLite  (curator.db)    │
│   4-stage cascade   │   │   Sessions · Fields       │
│   ST embeddings     │   │   Mappings · Audit log    │
└─────────────────────┘   └───────────────────────────┘
```

---

## 1. Frontend

**Stack:** React 18, React Router v6, custom CSS (no UI framework dependency)

| Route | Component | Purpose |
|---|---|---|
| `/` | `Dashboard.jsx` | Landing — mapper submit + analytics cards |
| `/analytics` | `Dashboard.jsx` tabs | Accuracy, confidence, method, failure views |
| `/upload` | `SessionCreator.jsx` | CSV upload → create curation session |
| `/curator/session/:id` | `CurationComponents/` | Field-by-field review workflow |

**Key design decisions:**
- No Redux — local state + custom hooks (`useMapperJob`, `useCurationSession`, `useMetrics`)
- Polling every 10 s for live job status (no WebSocket dependency)
- Confidence colour coding applied uniformly: green ≥ 0.85, amber 0.70–0.85, red < 0.70

---

## 2. Backend

**Stack:** FastAPI, Uvicorn, Python 3.12

### Routers

| Module | Prefix | Responsibility |
|---|---|---|
| `routers/health.py` | `/api/health` | Liveness + readiness check |
| `routers/metrics.py` | `/api/metrics` | Serve `mapper_evaluation_metrics.json` |
| `routers/mapper.py` | `/api/mapper` | Async job queue — submit, poll, fetch results |
| `curator_routes.py` | `/api/curator` | Session CRUD, field updates, export generation |

### Middleware
- **CORS** — open in dev; origin-restricted for production
- **Request-ID** — every response carries `X-Request-ID` (UUID4) for end-to-end tracing
- **Structured logging** — JSON log lines with request-ID, method, path, latency

### Async job queue
Mapper runs are CPU-bound and can take 10–60 s. They are dispatched to a background thread via `asyncio.get_event_loop().run_in_executor`, returning a `job_id` immediately. The client polls `/api/mapper/status/{job_id}` until status is `completed`.

---

## 3. ML Pipeline — SchemaMapEngine

A four-stage cascade. Each stage hands off only the fields it cannot resolve.

```
Input field name
      │
      ▼
┌─────────────────────────────────────┐
│ Stage 1 · Exact / Normalised Exact  │  precision 1.000 · 11 fields resolved
│  lowercase + underscore normalise   │
└──────────────────┬──────────────────┘
                   │ unresolved
                   ▼
┌─────────────────────────────────────┐
│ Stage 2 · Fuzzy String Match        │  SequenceMatcher ratio ≥ 0.75
└──────────────────┬──────────────────┘
                   │ unresolved
                   ▼
┌─────────────────────────────────────┐
│ Stage 3 · Semantic / Word-overlap   │  Jaccard token similarity ≥ 0.30
│  (sentence-transformers in full     │  (word-overlap proxy in evaluation)
│   SchemaMapEngine)                  │
└──────────────────┬──────────────────┘
                   │ unresolved
                   ▼
┌─────────────────────────────────────┐
│ Stage 4 · LLM / Synonym Dictionary  │  domain synonym lookup
│  BioBERT / PubMedBERT fallback      │  precision 1.000 · 3 fields resolved
└──────────────────┬──────────────────┘
                   │ unresolved
                   ▼
              NO_MATCH  →  curator manual entry
```

**Evaluation results on full 141-field dataset:**

| Stage | Precision | Recall | F1 |
|---|---|---|---|
| Exact | 1.000 | 0.423 | 0.595 |
| Fuzzy | 0.667 | 0.077 | 0.138 |
| Semantic | 0.474 | 0.346 | 0.400 |
| LLM/Dict | 1.000 | 0.115 | 0.207 |
| **Overall cascade** | **0.694** | **0.962** | **0.806** |

---

## 4. Database

**Engine:** SQLite (`curator_workflow.db`) via SQLAlchemy ORM

### Schema

```
CurationSession
  id            TEXT PK
  filename      TEXT
  status        ENUM (created | in_progress | completed | archived)
  created_at    DATETIME
  updated_at    DATETIME

CurationField
  id            TEXT PK
  session_id    TEXT FK → CurationSession
  field_name    TEXT
  suggestions   JSON        ← top-k mapper candidates with scores
  mapping       TEXT        ← accepted standard field name
  mapping_source ENUM (model | curator | curator_manual | unmapped)
  confidence    FLOAT
  status        ENUM (pending | approved | unmapped)
  notes         TEXT

CuratorEdit  (audit log)
  id            TEXT PK
  field_id      TEXT FK → CurationField
  action        ENUM (approve | reject | edit | bulk_approve)
  old_value     TEXT
  new_value     TEXT
  timestamp     DATETIME

ExportFile
  id            TEXT PK
  session_id    TEXT FK → CurationSession
  format        ENUM (csv | json | parquet)
  file_path     TEXT
  created_at    DATETIME
```

Every curator decision is recorded in `CuratorEdit` — enabling full reproducibility and future model retraining from human feedback.

---

## 5. Data Flow

### Mapper job
```
POST /api/mapper/run  →  job_id
GET  /api/mapper/status/{job_id}   (poll)
GET  /api/mapper/results/{job_id}  →  suggestions JSON
```

### Curator session
```
POST   /api/curator/sessions            →  session_id
GET    /api/curator/sessions/{id}       →  session + all fields
PATCH  /api/curator/sessions/{id}/fields/{fid}  →  update mapping/status
POST   /api/curator/sessions/{id}/export        →  generate CSV/JSON/Parquet
```

---

## 6. Key Design Decisions

| Decision | Rationale |
|---|---|
| SQLite over PostgreSQL | Zero-dependency local deployment; swap via `DATABASE_URL` env var |
| Async job queue (thread pool) | Keeps API responsive during 10–60 s mapper runs |
| Confidence tiers (not binary) | Exact/LLM precision = 1.0 → safe to auto-accept; semantic precision 0.47 → requires curator |
| Audit log in DB | Every decision traceable; enables active-learning feedback loop |
| No UI framework | Reduces bundle size; no version-lock risk for a research prototype |
| `status` field in metrics JSON | Transparently distinguishes `real_mapper_execution` from `synthetic_analysis` |

---

