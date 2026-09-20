# EduAlert

EduAlert is a machine learning-based early warning system designed for Kenyan universities. 
It analyses student academic and behavioural data to predict which students are at risk of 
failing before end-of-semester examinations, giving administrators and lecturers enough time 
to intervene.

## Features
- Predicts student failure risk using XGBoost classification model
- Trained on 9 academic and behavioural features including attendance, CAT scores, 
  assignment rates, late submission patterns, and fee balance status
- Role-based web dashboard for administrators and lecturers
- Intervention logging and semester analytics
- REST API for real-time risk predictions

## Tech Stack
- **Frontend:** React.js
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **ML Service:** Python + FastAPI + XGBoost

## ML Model Performance
| Model | Recall (At Risk) | Accuracy |
|---|---|---|
| Logistic Regression | 84.6% | 87% |
| Random Forest | 92.6% | 91% |
| XGBoost | 95.4% | 91% |

## Getting Started
### ML Service
```bash
cd ml-service
pip install -r requirements.txt
python preprocess.py
python train.py
uvicorn main:app --reload --port 8000
```

## Author
Evans — BSc Computer Science Final Year Project
