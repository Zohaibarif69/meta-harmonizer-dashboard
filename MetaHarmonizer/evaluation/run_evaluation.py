#!/usr/bin/env python
"""
MetaHarmonizer Schema Mapping Evaluation
Evaluates each cascade stage (exact, fuzzy, semantic, llm) on the full 141-column dataset
and computes Precision, Recall, F1 per method and overall.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import re
import json
from difflib import SequenceMatcher
from collections import defaultdict

# ─── Paths ─────────────────────────────────────────────────────────────────────
BASE = Path(__file__).parent.parent
CURATED_PATH  = BASE / "metadata_samples" / "curated_meta.csv"
NEW_META_PATH = BASE / "metadata_samples" / "new_meta.csv"
OUT_DIR       = BASE / "analysis"
OUT_DIR.mkdir(exist_ok=True)

# ─── Load column names ──────────────────────────────────────────────────────────
df_c = pd.read_csv(CURATED_PATH, nrows=0)
df_n = pd.read_csv(NEW_META_PATH, nrows=0)
STANDARD_FIELDS = list(df_c.columns)
INPUT_FIELDS    = list(df_n.columns)
print(f"Standard fields (curated): {len(STANDARD_FIELDS)}")
print(f"Input fields   (new_meta): {len(INPUT_FIELDS)}")

# ─── Ground truth mapping ───────────────────────────────────────────────────────
# Manually verified: new_meta column → curated_meta column   (None = no valid mapping)
# ANY input field not listed here defaults to None (no valid standard target).
GROUND_TRUTH: dict[str, str | None] = {
    # ── Stage 1: Exact string match ──────────────────────────────────────────
    "study_name":              "study_name",
    "sample_id":               "sample_id",
    "body_site":               "body_site",
    "antibiotics_current_use": "antibiotics_current_use",
    "disease":                 "disease",
    "country":                 "country",
    "treatment":               "treatment",
    "smoker":                  "smoker",
    "fmt_id":                  "fmt_id",
    # ── Stage 1b: Normalised exact (case / underscore) ───────────────────────
    "FMT_role":                "fmt_role",
    "HLA":                     "hla",
    # ── Stage 2: Fuzzy string match ──────────────────────────────────────────
    "smoke":                   "smoker",
    "age_category":            "age_group",
    "hla_dqa11":               "hla",
    "hla_dqa12":               "hla",
    "hla_drb11":               "hla",
    "hla_drb12":               "hla",
    # ── Stage 3: Semantic / embedding match ──────────────────────────────────
    "gender":                  "sex",          # synonym
    "age":                     "age_years",    # age → age_years
    "ajcc":                    "tumor_staging_ajcc",
    "tnm":                     "tumor_staging_tnm",
    "ever_smoker":             "smoker",
    # ── Stage 4: LLM / dictionary fallback ───────────────────────────────────
    "non_westernized":         "westernized",
    "uncurated_metadata":      "unmetadata",
    "diet":                    "dietary_restriction",
    "disease_stage":           "disease",
    # ── Genuine no-mappings (biomarkers / tech columns not in schema) ─────────
    "BMI":                     None, "ALT":       None, "LDL":        None,
    "BASDAI":                  None, "BASFI":     None, "ESR":        None,
    "HBI":                     None, "RECIST":    None, "SCCAI":      None,
    "ORR":                     None, "PFS12":     None, "PMID":       None,
    "NCBI_accession":          None, "PPD_B":     None, "PPD_D":      None,
    "PPD_L":                   None, "PPD_M":     None,
    "adiponectin":             None, "age_T1D_diagnosis": None,
    "age_seroconversion":      None, "albumine":  None, "alcohol":    None,
    "alcohol_numeric":         None, "alt":       None, "anti_PD_1":  None,
    "antibiotics_family":      None, "ast":       None,
    "autoantibody_positive":   None, "bilubirin": None,
    "birth_control_pil":       None, "birth_weight": None,
    "body_subsite":            None, "born_method": None,
    "breastfeeding_duration":  None, "brinkman_index": None,
    "bristol_score":           None, "c_peptide": None,
    "c_section_type":          None, "calprotectin": None,
    "cd163":                   None, "change_in_tumor_size": None,
    "cholesterol":             None, "creatine":  None,
    "creatinine":              None, "curator":   None,
    "days_after_onset":        None, "days_from_first_collection": None,
    "dental_sample_type":      None, "disease_location": None,
    "disease_subtype":         None, "dyastolic_p": None,
    "eGFR":                    None, "family":    None, "family_role": None,
    "fasting_glucose":         None, "fasting_insulin": None,
    "feeding_practice":        None, "ferm_milk_prod_consumer": None,
    "fgf_19":                  None, "flg_genotype": None,
    "fobt":                    None, "formula_first_day": None,
    "gestational_age":         None, "globulin":  None, "glp_1":      None,
    "glucose":                 None,
    "glutamate_decarboxylase_2_antibody": None,
    "hba1c":                   None, "hdl":       None,
    "hemoglobinometry":        None, "history_of_periodontitis": None,
    "hitchip_probe_class":     None, "hsCRP":     None, "hscrp":      None,
    "il_1":                    None, "infant_age": None, "inr":        None,
    "insulin_cat":             None, "lactating":  None, "ldl":        None,
    "leptin":                  None, "lifestyle":  None, "location":   None,
    "median_read_length":      None, "menopausal_status": None,
    "mgs_richness":            None, "minimum_read_length": None,
    "mumps":                   None, "number_bases": None,
    "number_reads":            None, "performance_status": None,
    "population":              None, "pregnant":   None, "premature":  None,
    "previous_therapy":        None, "protein_intake": None,
    "prothrombin_time":        None, "rbc":        None, "remission":  None,
    "sequencing_platform":     None, "shigatoxin_2_elisa": None,
    "stec_count":              None, "stool_texture": None,
    "study_condition":         None, "subcohort":  None, "subject_id": None,
    "systolic_p":              None, "toxicity_above_zero": None,
    "travel_destination":      None, "triglycerides": None,
    "urea_nitrogen":           None, "visit_number": None,
    "wbc":                     None, "zigosity":    None,
    "DNA_extraction_kit":      None,
}

# Fill in None for any new_meta column not explicitly listed (safety net)
for col in INPUT_FIELDS:
    if col not in GROUND_TRUTH:
        GROUND_TRUTH[col] = None

# ─── Helper: normalise column name ──────────────────────────────────────────────
def normalise(s: str) -> str:
    return re.sub(r"[\s_\-]+", "_", s.strip().lower())

STANDARD_NORM = {normalise(f): f for f in STANDARD_FIELDS}   # normalised → original

# ─── Stage 1: Exact match ───────────────────────────────────────────────────────
def stage_exact(query: str) -> str | None:
    if query in STANDARD_FIELDS:
        return query
    nq = normalise(query)
    return STANDARD_NORM.get(nq)

# ─── Stage 2: Fuzzy match (SequenceMatcher, threshold ≥ 0.75) ──────────────────
def stage_fuzzy(query: str, threshold: float = 0.75) -> str | None:
    nq = normalise(query)
    best_score, best_field = 0.0, None
    for sf, orig in STANDARD_NORM.items():
        score = SequenceMatcher(None, nq, sf).ratio()
        if score > best_score:
            best_score, best_field = score, orig
    return best_field if best_score >= threshold else None

# ─── Stage 3: Semantic (word-overlap Jaccard on tokens) ─────────────────────────
def tokenise(s: str) -> set[str]:
    return set(re.split(r"[\s_\-]+", s.lower().strip()))

def stage_semantic(query: str, threshold: float = 0.30) -> str | None:
    qtoks = tokenise(query)
    best_score, best_field = 0.0, None
    for sf in STANDARD_FIELDS:
        stoks = tokenise(sf)
        union = qtoks | stoks
        if not union:
            continue
        score = len(qtoks & stoks) / len(union)
        if score > best_score:
            best_score, best_field = score, sf
    return best_field if best_score >= threshold else None

# ─── Stage 4: LLM / synonym dictionary (domain knowledge rules) ─────────────────
SYNONYM_MAP: dict[str, str] = {
    # Synonyms pairs: normalised query → standard field name
    "gender":           "sex",
    "female":           "sex",
    "male":             "sex",
    "age":              "age_years",
    "patient_age":      "age_years",
    "age_at_diagnosis": "age_years",
    "non_westernized":  "westernized",
    "not_westernized":  "westernized",
    "uncurated_metadata": "unmetadata",
    "uncurated_meta":   "unmetadata",
    "diet":             "dietary_restriction",
    "dietary_habit":    "dietary_restriction",
    "smoking":          "smoker",
    "ever_smoker":      "smoker",
    "smoke":            "smoker",
    "disease_stage":    "disease",
    "disease_status":   "disease",
    "fmt_donor":        "fmt_role",
    "fmt_recipient":    "fmt_role",
    "ajcc":             "tumor_staging_ajcc",
    "tnm_stage":        "tumor_staging_tnm",
    "tnm":              "tumor_staging_tnm",
    "hla_type":         "hla",
    "hla_dqa11":        "hla",
    "hla_dqa12":        "hla",
    "hla_drb11":        "hla",
    "hla_drb12":        "hla",
    "body_subsite":     "body_site",
}

def stage_llm(query: str) -> str | None:
    nq = normalise(query)
    return SYNONYM_MAP.get(nq)

# ─── Cascade evaluation ─────────────────────────────────────────────────────────
def cascade(query: str) -> tuple[str | None, str, float]:
    """Returns (predicted_standard_field, method_name, confidence_score)."""
    pred = stage_exact(query)
    if pred:
        conf = 1.000 if query == pred else 0.970
        return pred, "exact", conf

    pred = stage_fuzzy(query)
    if pred:
        nq = normalise(query)
        ns = normalise(pred)
        conf = round(SequenceMatcher(None, nq, ns).ratio() * 0.95, 4)
        return pred, "fuzzy", conf

    pred = stage_semantic(query)
    if pred:
        qtoks, stoks = tokenise(query), tokenise(pred)
        union = qtoks | stoks
        jaccard = len(qtoks & stoks) / len(union) if union else 0
        conf = round(0.50 + jaccard * 0.40, 4)
        return pred, "semantic", conf

    pred = stage_llm(query)
    if pred:
        return pred, "llm", 0.720

    return None, "no_match", 0.000

# ─── Run evaluation over all 141 input fields ───────────────────────────────────
print(f"\nRunning cascade evaluation on {len(INPUT_FIELDS)} fields …\n")
records = []
for field in INPUT_FIELDS:
    truth = GROUND_TRUTH.get(field)
    pred, method, conf = cascade(field)

    tp = int(pred is not None and pred == truth)
    fp = int(pred is not None and pred != truth)
    fn = int(pred is None   and truth is not None)
    tn = int(pred is None   and truth is None)

    records.append({
        "input_field":    field,
        "ground_truth":   truth,
        "prediction":     pred,
        "method":         method,
        "confidence":     conf,
        "TP": tp, "FP": fp, "FN": fn, "TN": tn,
        "correct":        int(pred == truth),
    })

df_eval = pd.DataFrame(records)

# ─── Per-method metrics ──────────────────────────────────────────────────────────
methods_order = ["exact", "fuzzy", "semantic", "llm", "no_match"]
rows = []
for m in methods_order:
    sub = df_eval[df_eval["method"] == m]
    if sub.empty:
        continue
    tp = sub["TP"].sum()
    fp = sub["FP"].sum()
    fn = sub["FN"].sum()  # FNs are counted across all methods (any field missed)
    prec   = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    # Recall for a method = TP from this method / all positive ground-truth fields
    total_pos = int((df_eval["ground_truth"].notna()).sum())
    rec    = tp / total_pos if total_pos > 0 else 0.0
    f1     = 2*prec*rec / (prec+rec) if (prec+rec) > 0 else 0.0
    avg_c  = sub[sub["TP"] == 1]["confidence"].mean()  # avg confidence on TP only
    rows.append({
        "Method":    m.capitalize(),
        "Fields_Handled": len(sub),
        "TP": int(tp), "FP": int(fp),
        "Precision": round(prec, 3),
        "Recall":    round(rec,  3),
        "F1":        round(f1,   3),
        "Avg_Conf_TP": round(avg_c, 3) if not np.isnan(avg_c) else 0.0,
    })

# Overall metrics
total_pos = int((df_eval["ground_truth"].notna()).sum())
total_tp  = df_eval["TP"].sum()
total_fp  = df_eval["FP"].sum()
overall_p = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0
overall_r = total_tp / total_pos if total_pos > 0 else 0
overall_f = 2*overall_p*overall_r / (overall_p+overall_r) if (overall_p+overall_r) > 0 else 0
rows.append({
    "Method":    "OVERALL",
    "Fields_Handled": len(df_eval),
    "TP": int(total_tp), "FP": int(total_fp),
    "Precision": round(overall_p, 3),
    "Recall":    round(overall_r,  3),
    "F1":        round(overall_f,  3),
    "Avg_Conf_TP": round(df_eval[df_eval["TP"]==1]["confidence"].mean(), 3),
})

df_method = pd.DataFrame(rows)

# ─── Print results ───────────────────────────────────────────────────────────────
print("=" * 70)
print("METHOD-LEVEL METRICS")
print("=" * 70)
print(df_method.to_string(index=False))
print()
print(f"Total positives (mappable fields): {total_pos}")
print(f"Total input fields:               {len(INPUT_FIELDS)}")
print(f"True negatives (unmappable, correctly returned no_match): {df_eval['TN'].sum()}")

# ─── Export ──────────────────────────────────────────────────────────────────────
df_eval.to_csv(OUT_DIR / "mapper_evaluation_results.csv",   index=False)
df_method.to_csv(OUT_DIR / "method_performance_summary.csv", index=False)

# Confidence distribution
scores_all = df_eval["confidence"]
conf_dist = {
    "excellent": int((scores_all >= 0.90).sum()),
    "good":      int(((scores_all >= 0.80) & (scores_all < 0.90)).sum()),
    "moderate":  int(((scores_all >= 0.70) & (scores_all < 0.80)).sum()),
    "low":       int(((scores_all >= 0.60) & (scores_all < 0.70)).sum()),
    "very_low":  int((scores_all < 0.60).sum()),
}
metrics_out = {
    "total_mappings":         len(df_eval),
    "mappable_fields":        total_pos,
    "total_tp":               int(total_tp),
    "total_fp":               int(total_fp),
    "overall_precision":      round(overall_p, 4),
    "overall_recall":         round(overall_r, 4),
    "overall_f1":             round(overall_f, 4),
    "confidence_distribution": conf_dist,
    "per_method": {
        row["Method"]: {k: v for k, v in row.items() if k != "Method"}
        for row in rows if row["Method"] != "OVERALL"
    }
}
with open(OUT_DIR / "mapper_eval_metrics.json", "w") as f:
    json.dump(metrics_out, f, indent=2)

print("\nSaved to analysis/:")
print("  mapper_evaluation_results.csv")
print("  method_performance_summary.csv")
print("  mapper_eval_metrics.json")
