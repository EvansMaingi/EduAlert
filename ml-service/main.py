"""EduAlert ML service: serves student failure-risk predictions from the trained model."""

from contextlib import asynccontextmanager
from pathlib import Path

import joblib
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

MODEL_PATH = Path(__file__).resolve().parent / "model.pkl"

state = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    state["model"] = joblib.load(MODEL_PATH)
    yield
    state.clear()


app = FastAPI(title="EduAlert ML Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class StudentFeatures(BaseModel):
    attendance_rate: float
    cat_score_avg: float
    assignment_submission_rate: float
    late_submission_rate: float
    fee_balance_outstanding: int
    prior_unit_failure: int
    year_of_study: int
    units_registered: int


class PredictionResponse(BaseModel):
    risk_score: float
    risk_label: str
    risk_percentage: float


# Must match the column order used in train.py (edualert_dataset.csv without "result")
FEATURE_ORDER = list(StudentFeatures.model_fields)


@app.post("/predict", response_model=PredictionResponse)
def predict(student: StudentFeatures) -> PredictionResponse:
    model = state["model"]
    values = student.model_dump()
    features = np.array([[values[name] for name in FEATURE_ORDER]])

    prediction = int(model.predict(features)[0])
    risk_score = round(float(model.predict_proba(features)[0][1]), 4)

    return PredictionResponse(
        risk_score=risk_score,
        risk_label="At Risk" if prediction == 1 else "Safe",
        risk_percentage=round(risk_score * 100, 1),
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
