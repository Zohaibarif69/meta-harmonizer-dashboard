# Integration Plan — MetaHarmonizer × cBioPortal Data Loading Pipeline

This document proposes how MetaHarmonizer integrates into the existing cBioPortal
curator workflow, replacing manual harmonization steps with an automated-then-reviewed
pipeline without disrupting existing tooling or data formats.

---

## Problem Statement

cBioPortal's data loading pipeline (`cbioportal-docker-compose` / `cbioportal-tools`)
expects clinical metadata to conform to a strict tab-delimited format with controlled
attribute names. Today, curators harmonize metadata manually before ingestion —
a process that does not scale as the repository adds new studies continuously.

MetaHarmonizer automates the first pass: mapping raw study attribute names to the
cBioPortal standard schema, scoring each mapping by confidence, and surfacing
uncertain cases for human review. The curator approves, rejects, or overrides before
the harmonized file enters the loading pipeline.

---

## Integration Architecture

```
New cBioPortal Study
        │
        ▼
┌───────────────────┐
│  Study Ingest     │  Raw clinical_data.txt uploaded via curator portal
│  (existing)       │  or fetched from GEO / synapse / internal source
└────────┬──────────┘
         │  raw CSV / TSV
         ▼
┌───────────────────────────────────────┐
│  MetaHarmonizer API                   │
│                                       │
│  POST /api/metadata/upload            │  ① Ingest raw file, detect columns
│  POST /api/mapper/run                 │  ② Run 4-stage cascade (Exact →
│                                       │     Fuzzy → Semantic → LLM)
│  GET  /api/mapper/status/{job_id}     │  ③ Poll until complete
│  GET  /api/mapper/result/{job_id}     │  ④ Retrieve mappings + confidence
└────────┬──────────────────────────────┘
         │  mappings + confidence scores
         ▼
┌───────────────────────────────────────┐
│  Curator Review (Dashboard)           │
│                                       │
│  PUT  /api/fields/{field_id}          │  ⑤ Accept / reject / override
│  POST /api/sessions/{id}/bulk-approve │  ⑥ Auto-approve high-confidence
│  GET  /api/sessions/{id}/progress     │  ⑦ Track completion
└────────┬──────────────────────────────┘
         │  curator-approved mappings
         ▼
┌───────────────────────────────────────┐
│  Export                               │
│                                       │
│  POST /api/sessions/{id}/export       │  ⑧ Generate harmonized CSV + JSON
│                                       │     + rejection log
└────────┬──────────────────────────────┘
         │  harmonized clinical_data.txt
         ▼
┌───────────────────────────────────────┐
│  cBioPortal Data Loading Pipeline     │  ⑨ validateData.py passes cleanly
│  (existing, unchanged)                │     importStudy.py ingests study
└───────────────────────────────────────┘
```

MetaHarmonizer sits between raw study intake and the cBioPortal validator.
Steps ① – ⑧ are new; step ⑨ is unchanged.

---

## Integration Points

### A. File Format Compatibility

cBioPortal expects `clinical_data.txt` in a specific 5-header-row tab-delimited format.
MetaHarmonizer's export endpoint (`POST /api/sessions/{id}/export`) produces:

| Output | Format | Downstream use |
|---|---|---|
| `harmonized_clinical_data.txt` | cBioPortal tab-delimited, 5-header format | Direct input to `validateData.py` |
| `mapping_report.json` | Field-level decisions + confidence + method | Audit trail, stored alongside study |
| `rejection_log.csv` | Unmapped fields with root cause | Flags for manual follow-up |

The export endpoint (`POST /api/sessions/{id}/export`) is structured and persists export
records to the database. The cBioPortal tab-delimited writer — applying approved column
renames, emitting the 5-header rows (`#Patient Identifier`, `#STRING`, etc.), and
generating the rejection log — is scoped for implementation in GSoC Phase 2 alongside
full pipeline integration testing.

### B. API-First Design for Pipeline Automation

All MetaHarmonizer operations are available over REST, enabling future automation:

```
# Example: fully automated harmonization for a high-confidence study
curl -X POST /api/metadata/upload -F "file=@clinical_data.txt"
# → returns session_id, file_id

curl -X POST /api/mapper/run -d '{"session_id": "...", "confidence_threshold": 0.85}'
# → returns job_id

# poll until complete, then bulk-approve all fields above threshold
curl -X POST /api/sessions/{session_id}/bulk-approve \
  -d '{"confidence_threshold": 0.85, "method_filter": ["exact", "fuzzy"]}'

# export
curl -X POST /api/sessions/{session_id}/export -d '{"format": "cbio"}'
```

Studies where the cascade achieves ≥ 0.85 confidence on all fields can be approved
without human review. Based on evaluation results (Precision 0.694, Recall 0.962),
this applies to studies whose attributes closely match the standard schema — typically
re-submissions or studies from known institutions.

### C. Confidence-Gated Human Review

Not every study needs the same level of curator attention. The integration uses
confidence thresholds to route work:

| Confidence band | Action | Rationale |
|---|---|---|
| ≥ 0.85 (Exact / Fuzzy match) | Auto-approve, log for audit | Near-certain; same as manual match |
| 0.50 – 0.84 (Semantic / LLM) | Curator review required | Ambiguous; human judgment needed |
| < 0.50 or NO_MATCH | Flag as unresolvable | Add to rejection log; document gap |

This mirrors the existing cBioPortal curator triage process — high-volume routine cases
are handled automatically, edge cases escalate to domain experts.

### D. Ontology Alignment

cBioPortal requires NCIT / MONDO term codes for categorical variables.
The inline Ontology Lookup panel queries OLS at review time, returning:

- Ontology term ID (e.g., `NCIT:C25208`)
- Preferred label and synonyms
- Parent terms for hierarchy context

The curator can attach the returned term to the mapping before export.
The harmonized file then carries the ontology annotation in the correct cBioPortal
column format, satisfying `validateData.py` ontology checks.

### E. Edit History and Audit Trail

All curator decisions are recorded in `GET /api/sessions/{id}/edits`:

```json
{
  "field_id": "...",
  "original_value": "AGE_AT_DIAGNOSIS",
  "suggested_value": "age_at_diagnosis",
  "curator_action": "accepted",
  "confidence": 0.91,
  "method": "fuzzy",
  "timestamp": "2026-03-12T10:34:22Z"
}
```

This log is exportable alongside the harmonized file and satisfies cBioPortal's
data provenance requirements for studies submitted to the main portal.

---

## Phased Rollout

### Phase 1 — Standalone Tool (current state)
MetaHarmonizer runs as an independent web service.
Curators upload files manually, download harmonized outputs, and feed them into
the existing loading pipeline by hand.
No changes to cBioPortal infrastructure.

### Phase 2 — API Hook in Data Loading Scripts
Add a MetaHarmonizer pre-processing step to `cbioportal-tools` importer scripts.
Before `validateData.py` runs, the script calls the MetaHarmonizer API, waits for
curator approval, and fetches the harmonized file automatically.
Curators interact only through the MetaHarmonizer dashboard; the rest of the
pipeline is unchanged.

### Phase 3 — Native cBioPortal Integration
MetaHarmonizer is deployed as a microservice within the cBioPortal infrastructure
(Docker Compose service alongside `cbioportal`, `mysql`, `redis`).
The cBioPortal study submission UI links directly to the MetaHarmonizer session
for the uploaded study. Harmonization becomes a mandatory step in the submission
checklist before a study reaches a data loading queue.

---

## Deployment

MetaHarmonizer is containerised and stateless except for the SQLite database.
Dropping into an existing cBioPortal Docker Compose stack requires three additions:

```yaml
# docker-compose.yml addition
metaharmonizer:
  image: metaharmonizer:latest
  environment:
    - DATABASE_URL=sqlite:///./data/metaharmonizer.db
    - SECRET_KEY=${MH_SECRET_KEY}
    - CBIO_SCHEMA_PATH=/data/curated_meta.csv
  volumes:
    - mh_data:/data
  ports:
    - "8000:8000"
  depends_on:
    - cbioportal
```

No changes to existing cBioPortal containers. The SQLite database can be swapped
for PostgreSQL for production deployments with concurrent curator teams.

---

## What This Delivers for GSoC Issue #136

| Deliverable from issue | MetaHarmonizer status |
|---|---|
| REST API for harmonization pipeline access | Complete — 19 endpoints across mapper, curator, and health routers |
| Integration guide for cBioPortal data loading | This document |
| Benchmarking report on existing mappers | `docs/MAPPER_EVALUATION.md` |
| Dashboard with curator review workflow | Complete — live at localhost:3000 |
| Export endpoint structure | `/api/sessions/{id}/export` exists; cBioPortal tab-delimited writer scoped for Phase 2 |
| Ontology integration (NCIT / MONDO) | OLS lookup panel in curator UI |
