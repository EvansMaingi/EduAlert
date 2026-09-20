"""Build the EduAlert training dataset from student_performance.csv.

Maps the public student-performance data onto EduAlert's features and adds
synthetic Kenyan-university features. Writes edualert_dataset.csv next to this file.
"""

from pathlib import Path

import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
INPUT_CANDIDATES = ["student_performance.csv", "student_performance.csv.csv"]
OUTPUT_PATH = BASE_DIR / "edualert_dataset.csv"

SEED = 42

# The source file has no AttendanceRate / PreviousScore columns, so both are derived.
TOTAL_SESSIONS = 30  # Absences in the source data range 0-29
CAT_NOISE_SD = 5.0   # GPA determines GradeClass in the source data; noise softens the leakage

YEAR_WEIGHTS = [0.25, 0.30, 0.28, 0.17]
# P(units_registered = 4, 5, 6, 7) by year of study: heavier loads in later years
UNITS_WEIGHTS = {
    1: [0.35, 0.35, 0.20, 0.10],
    2: [0.20, 0.35, 0.30, 0.15],
    3: [0.10, 0.25, 0.40, 0.25],
    4: [0.05, 0.20, 0.35, 0.40],
}

FEATURE_COLUMNS = [
    "attendance_rate",
    "cat_score_avg",
    "assignment_submission_rate",
    "late_submission_rate",
    "fee_balance_outstanding",
    "prior_unit_failure",
    "year_of_study",
    "units_registered",
    "result",
]


def load_source() -> pd.DataFrame:
    for name in INPUT_CANDIDATES:
        path = BASE_DIR / name
        if path.exists():
            return pd.read_csv(path)
    raise FileNotFoundError(f"None of {INPUT_CANDIDATES} found in {BASE_DIR}")


def main() -> None:
    rng = np.random.default_rng(SEED)
    src = load_source().dropna(subset=["Absences", "GPA", "StudyTimeWeekly", "GradeClass"])
    n = len(src)

    df = pd.DataFrame(index=src.index)

    # --- Mapped from the source data (percentages, 0-100) ---
    df["attendance_rate"] = (100 * (1 - src["Absences"] / TOTAL_SESSIONS)).clip(0, 100)

    cat = src["GPA"] / 4.0 * 100 + rng.normal(0, CAT_NOISE_SD, n)
    df["cat_score_avg"] = cat.clip(0, 100)

    study = src["StudyTimeWeekly"]
    df["assignment_submission_rate"] = 40 + (study - study.min()) / (study.max() - study.min()) * 55

    # GradeClass: 0=A, 1=B, 2=C, 3=D, 4=F  ->  0=Safe, 1=At Risk
    df["result"] = (src["GradeClass"] >= 3).astype(int)

    # --- Synthetic Kenyan-specific features ---
    year = rng.choice([1, 2, 3, 4], size=n, p=YEAR_WEIGHTS)
    df["year_of_study"] = year
    df["units_registered"] = [rng.choice([4, 5, 6, 7], p=UNITS_WEIGHTS[y]) for y in year]

    # Late submissions fall as attendance rises: ~60% at 0 attendance, ~5% at 100
    late_mean = 60 - 0.55 * df["attendance_rate"]
    df["late_submission_rate"] = (late_mean + rng.normal(0, 8, n)).clip(0, 100)

    # Fee arrears are more likely with low attendance and low CAT scores
    p_fee = 0.10 + 0.35 * (1 - df["attendance_rate"] / 100) + 0.35 * (1 - df["cat_score_avg"] / 100)
    df["fee_balance_outstanding"] = (rng.random(n) < p_fee.clip(0.05, 0.85)).astype(int)

    # Prior failures are more likely with low CAT scores: p = 0.6 at 0, 0.03 floor
    p_fail = 0.60 - 0.006 * df["cat_score_avg"]
    df["prior_unit_failure"] = (rng.random(n) < p_fail.clip(0.03, 0.60)).astype(int)

    df = df[FEATURE_COLUMNS]
    for col in ["attendance_rate", "cat_score_avg", "assignment_submission_rate", "late_submission_rate"]:
        df[col] = df[col].round(2)

    df.to_csv(OUTPUT_PATH, index=False)

    print(f"Saved {OUTPUT_PATH}")
    print(f"\nShape: {df.shape}")
    print("\nClass distribution (result: 0=Safe, 1=At Risk):")
    print(pd.DataFrame({"count": df["result"].value_counts().sort_index(),
                        "share": df["result"].value_counts(normalize=True).sort_index().round(3)}))
    print("\nFirst 5 rows:")
    print(df.head().to_string(index=False))


if __name__ == "__main__":
    main()
