# EduAlert — Project Context

## What this is
A machine learning-based early warning system that predicts student academic failure risk in Kenyan universities.

## Tech stack
- Frontend: React.js
- Backend: Node.js + Express
- Database: PostgreSQL
- ML Microservice: Python + FastAPI + XGBoost
- Auth: JWT tokens

## Project structure
edualert/
├── client/        ← React frontend
├── server/        ← Node.js backend
├── ml-service/    ← Python FastAPI ML microservice
└── database/      ← PostgreSQL schema

## ML features (9 inputs)
attendance_rate, cat_score_avg, assignment_submission_rate,
late_submission_rate, fee_balance_outstanding, units_registered,
year_of_study, prior_unit_failure, result (target)

## Models
Logistic Regression (baseline), Random Forest (benchmark), XGBoost (primary)

## Users
Administrators and Lecturers — role-based dashboard