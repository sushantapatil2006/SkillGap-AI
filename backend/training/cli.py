import argparse
import hashlib
import json
import os
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import joblib
import numpy as np
import sklearn
from sklearn.dummy import DummyClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sqlalchemy.orm import Session

from app.db import get_engine
from app.ml import profile_text
from app.models import JobRole, Skill
from training.dataset import Dataset, read_dataset


def import_catalog(dataset: Dataset):
    with Session(get_engine()) as db:
        for record, model in [(s, Skill) for s in dataset.skills] + [
            (r, JobRole) for r in dataset.roles
        ]:
            db.merge(model(id=record.id, data=record.model_dump()))
        db.commit()


def metrics(pipeline, texts, labels):
    predicted = pipeline.predict(texts)
    classes = pipeline.classes_
    top = np.argsort(-pipeline.predict_proba(texts), axis=1)[:, : min(3, len(classes))]
    return {
        "count": len(labels),
        "accuracy": float(accuracy_score(labels, predicted)),
        "macro_f1": float(f1_score(labels, predicted, average="macro", zero_division=0)),
        "top_3_accuracy": float(
            np.mean([label in classes[row] for label, row in zip(labels, top, strict=True)])
        ),
        "labels": classes.tolist(),
        "confusion_matrix": confusion_matrix(labels, predicted, labels=classes).tolist(),
        "classification_report": classification_report(
            labels, predicted, labels=classes, output_dict=True, zero_division=0
        ),
    }


def train(dataset: Dataset, output: Path):
    texts = np.array([job.description for job in dataset.jobs])
    labels = np.array([job.role_id for job in dataset.jobs])
    groups = np.array([job.group_id for job in dataset.jobs])
    expected = {role.id for role in dataset.roles}
    for role in expected:
        if len(set(groups[labels == role])) < 5:
            raise ValueError(
                f"Role {role} needs at least five independent groups; collect more data"
            )
    # Five disjoint groups of folds: three train, one validation, one held-out test.
    splitter = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
    folds = [test for _, test in splitter.split(texts, labels, groups)]
    train_idx, val_idx, test_idx = np.concatenate(folds[2:]), folds[1], folds[0]
    for name, indices in [("training", train_idx), ("validation", val_idx), ("test", test_idx)]:
        if set(labels[indices]) != expected:
            raise ValueError(
                f"The grouped {name} split lacks classes; add/rebalance independent groups"
            )
    candidates = []
    for regularization in (0.1, 1.0, 10.0):
        pipeline = Pipeline(
            [
                (
                    "tfidf",
                    TfidfVectorizer(
                        ngram_range=(1, 2),
                        sublinear_tf=True,
                        max_features=30000,
                        token_pattern=r"(?u)\b\w[\w+#.]*\b",
                    ),
                ),
                (
                    "classifier",
                    LogisticRegression(
                        C=regularization, max_iter=2000, class_weight="balanced", random_state=42
                    ),
                ),
            ]
        )
        pipeline.fit(texts[train_idx], labels[train_idx])
        evaluation = metrics(pipeline, texts[val_idx], labels[val_idx])
        candidates.append((evaluation["macro_f1"], pipeline, evaluation, regularization))
    _, selected, validation, regularization = max(candidates, key=lambda value: value[0])
    baseline = DummyClassifier(strategy="prior").fit(texts[train_idx], labels[train_idx])
    metadata = {
        "dataset_version": dataset.version,
        "provenance": dataset.provenance,
        "trained_at": datetime.now(UTC).isoformat(),
        "sklearn_version": sklearn.__version__,
        "selected_C": regularization,
        "validation": validation,
        "test": metrics(selected, texts[test_idx], labels[test_idx]),
        "majority_baseline_test": metrics(baseline, texts[test_idx], labels[test_idx]),
        "split_groups": {
            name: sorted(set(groups[indices]))
            for name, indices in [("train", train_idx), ("validation", val_idx), ("test", test_idx)]
        },
        "split": {
            name: [dataset.jobs[i].id for i in indices]
            for name, indices in [("train", train_idx), ("validation", val_idx), ("test", test_idx)]
        },
        "student_evaluation": None,
        "limitations": "Job role labels train a job-text classifier. Student outcomes require separate validation. Near duplicates must share group_id. Scores are not calibrated.",
    }
    if dataset.student_profiles:
        metadata["student_evaluation"] = metrics(
            selected,
            [profile_text(s.profile.model_dump()) for s in dataset.student_profiles],
            [s.role_id for s in dataset.student_profiles],
        )
    version = f"baseline-{datetime.now(UTC):%Y%m%dT%H%M%SZ}-{uuid4().hex[:8]}"
    artifact = {
        "schema_version": "1.0",
        "model_version": version,
        "pipeline": selected,
        "skills": [s.model_dump() for s in dataset.skills],
        "roles": [r.model_dump() for r in dataset.roles],
        "metadata": metadata,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists() or output.with_suffix(".json").exists():
        raise ValueError("Output exists; use a new versioned output path")
    temporary = output.with_name(f".{output.name}.{uuid4().hex}.tmp")
    joblib.dump(artifact, temporary)
    checksum = hashlib.sha256(temporary.read_bytes()).hexdigest()
    manifest = {"model_version": version, "sha256": checksum, **metadata}
    output.with_suffix(".json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    os.replace(temporary, output)
    return manifest


def main():
    parser = argparse.ArgumentParser(
        description="Validate real datasets, import catalogs and train baseline models"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("schema", help="Print JSON Schema for the dataset contract")
    for command in ("validate", "import", "train"):
        sub = subparsers.add_parser(command)
        sub.add_argument("dataset", type=Path)
        if command == "train":
            sub.add_argument("--output", type=Path, required=True)
    predict_sub = subparsers.add_parser("predict", help="Predict career roles for a candidate profile")
    predict_sub.add_argument("--model", type=Path, default=Path("artifacts/model.joblib"), help="Path to .joblib artifact")
    predict_sub.add_argument("--profile", type=Path, help="Path to profile JSON file")
    predict_sub.add_argument("--evidence", type=str, default="Python and SQL data analysis with ETL pipelines.", help="Text evidence")

    args = parser.parse_args()
    if args.command == "schema":
        print(json.dumps(Dataset.model_json_schema(), indent=2))
        return
    if args.command == "predict":
        from app.ml import load_predictor
        if not args.model.exists():
            parser.exit(1, f"Model not found at {args.model}. Train a model first.\n")
        manifest_path = args.model.with_suffix(".json")
        predictor = load_predictor(str(args.model.resolve()), args.model.stat().st_mtime_ns, manifest_path.stat().st_mtime_ns)
        if args.profile and args.profile.exists():
            profile_data = json.loads(args.profile.read_text(encoding="utf-8"))
        else:
            profile_data = {
                "project_summary": args.evidence,
                "experience_summary": args.evidence,
                "skills": [
                    {"name": "Python", "level": 3},
                    {"name": "SQL", "level": 2},
                    {"name": "Data Analysis", "level": 2},
                ],
            }
        prediction = predictor.predict(profile_data, {"track": "data", "time_budget": "10_hours"})
        print(json.dumps(prediction, indent=2))
        return
    try:
        dataset = read_dataset(args.dataset)
        if args.command == "import":
            import_catalog(dataset)
        elif args.command == "train":
            manifest = train(dataset, args.output)
            print(
                json.dumps(
                    {"model_version": manifest["model_version"], "test": manifest["test"]}, indent=2
                )
            )
            return
        print(
            json.dumps(
                {
                    "status": "ok",
                    "operation": args.command,
                    "dataset_version": dataset.version,
                    "jobs": len(dataset.jobs),
                    "roles": len(dataset.roles),
                }
            )
        )
    except (ValueError, OSError) as exc:
        # Do not echo validation input, which may contain student personal data.
        parser.exit(
            1,
            f"Dataset operation failed ({type(exc).__name__}). Check the documented schema, references, unique IDs and group counts.\n",
        )


if __name__ == "__main__":
    main()
