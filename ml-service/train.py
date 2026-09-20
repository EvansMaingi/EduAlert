"""Train the EduAlert models, pick the one with the best At Risk recall, and save it as model.pkl."""

from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, recall_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "edualert_dataset.csv"
MODEL_PATH = BASE_DIR / "model.pkl"

SEED = 42


def main() -> None:
    df = pd.read_csv(DATASET_PATH)
    X = df.drop(columns=["result"])
    y = df["result"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=SEED, stratify=y
    )

    models = {
        "Logistic Regression": LogisticRegression(class_weight="balanced", max_iter=1000),
        "Random Forest": RandomForestClassifier(
            n_estimators=100, class_weight="balanced", random_state=SEED
        ),
        "XGBoost": XGBClassifier(
            n_estimators=200,
            learning_rate=0.1,
            max_depth=4,
            scale_pos_weight=2,
            random_state=SEED,
            eval_metric="logloss",
        ),
    }

    recalls = {}
    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        recalls[name] = recall_score(y_test, y_pred, pos_label=1)

        print("=" * 60)
        print(name)
        print("=" * 60)
        print(classification_report(y_test, y_pred, target_names=["Safe (0)", "At Risk (1)"]))
        print("Confusion matrix (rows = actual, cols = predicted):")
        print(confusion_matrix(y_test, y_pred))
        print()

    best_name = max(recalls, key=recalls.get)
    best_model = models[best_name]
    joblib.dump(best_model, MODEL_PATH)

    if best_name in ("XGBoost", "Random Forest"):
        ranked = sorted(
            zip(X.columns, best_model.feature_importances_), key=lambda t: t[1], reverse=True
        )
        print(f"Feature importance ({best_name}):")
        for rank, (feature, importance) in enumerate(ranked, start=1):
            print(f"  {rank}. {feature:<28} {importance:.4f}")
        print()

    print("=" * 60)
    print("Summary")
    print("=" * 60)
    for name, recall in recalls.items():
        print(f"  {name:<22} At Risk recall: {recall:.4f}")
    print(f"\nWinner: {best_name} (At Risk recall = {recalls[best_name]:.4f})")
    print(f"Saved to {MODEL_PATH}")


if __name__ == "__main__":
    main()
