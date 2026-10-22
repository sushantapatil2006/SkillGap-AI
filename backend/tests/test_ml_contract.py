import json

import numpy as np
import pytest
from pydantic import ValidationError
from scipy.sparse import csr_matrix

from app.ml import Predictor, learning_plan, load_predictor, profile_text
from training.cli import train
from training.dataset import Dataset


def contract_fixture():
    # Minimal schema-validation fixture. Not a seed, training dataset or model artifact.
    return {
        "schema_version": "1.0",
        "version": "test-only",
        "provenance": "Isolated contract test fixture; never used for application training.",
        "skills": [
            {"id": "skill_a", "name": "Skill A"},
            {"id": "skill_b", "name": "Skill B", "prerequisites": ["skill_a"]},
        ],
        "roles": [
            {
                "id": id,
                "title": id,
                "description": "A sufficiently long contract-test description.",
                "requirements": [{"skill_id": "skill_b", "level": 3, "weight": 1}],
            }
            for id in ("role_a", "role_b")
        ],
        "jobs": [
            {
                "id": "job_a",
                "role_id": "role_a",
                "description": "This is only a schema-validation job description fixture.",
                "group_id": "group_a",
                "source": "test fixture",
            }
        ],
    }


def test_contract_and_training_refuses_insufficient_data(tmp_path):
    dataset = Dataset.model_validate(contract_fixture())
    with pytest.raises(ValueError, match="five independent groups"):
        train(dataset, tmp_path / "not-created.joblib")
    assert not list(tmp_path.iterdir())


@pytest.mark.parametrize("defect", ["duplicate", "cycle", "alias", "role", "skill", "nan"])
def test_dataset_rejects_inconsistent_records(defect):
    data = contract_fixture()
    if defect == "duplicate":
        data["jobs"].append({**data["jobs"][0], "id": "job_b"})
    elif defect == "cycle":
        data["skills"][0]["prerequisites"] = ["skill_b"]
    elif defect == "alias":
        data["skills"][1]["aliases"] = ["Skill A"]
    elif defect == "role":
        data["jobs"][0]["role_id"] = "missing"
    elif defect == "skill":
        data["roles"][0]["requirements"][0]["skill_id"] = "missing"
    else:
        data["roles"][0]["requirements"][0]["weight"] = float("nan")
    with pytest.raises(ValidationError):
        Dataset.model_validate(data)


def test_profile_features_exclude_preferences_and_personal_details(profile):
    profile["display_name"] = "PrivateName"
    profile["desired_roles"] = ["PreferenceMustNotBecomePrediction"]
    profile["education_level"] = "PrivateSchool"
    output = profile_text(
        profile,
        {
            "preferred_roles": "AnotherPreference",
            "constraints": "PrivateConstraint",
            "project_evidence": "VerifiedWork",
        },
    )
    assert "Python" in output and "VerifiedWork" in output
    assert not any(
        word in output
        for word in [
            "PrivateName",
            "PreferenceMustNotBecomePrediction",
            "PrivateSchool",
            "AnotherPreference",
            "PrivateConstraint",
        ]
    )


def test_prerequisite_order_full_target_and_known_skills():
    skills = {
        "a": {"name": "A", "prerequisites": []},
        "b": {"name": "B", "prerequisites": ["a"]},
        "c": {"name": "C", "prerequisites": ["b"]},
    }
    gaps = [
        {"skill_id": "c", "required_level": 3, "required": True},
        {"skill_id": "a", "required_level": 4, "required": True},
    ]
    result = learning_plan(skills, {}, gaps)
    assert [r["skill_id"] for r in result] == ["a", "b", "c"]
    assert result[0]["target_level"] == 4
    result = learning_plan(skills, {"a": 4}, gaps)
    assert [r["skill_id"] for r in result] == ["b", "c"]


def test_artifact_checksum_checked_before_deserialization(tmp_path):
    path = tmp_path / "untrusted.joblib"
    path.write_bytes(b"not a valid artifact")
    path.with_suffix(".json").write_text(json.dumps({"sha256": "wrong"}))
    with pytest.raises(ValueError, match="checksum"):
        load_predictor(str(path), 1, 1)


def test_prediction_math_aliases_and_unassessed_skills():
    # Isolate deterministic recommendation logic from model training.
    class VectorizerDouble:
        def transform(self, texts):
            return csr_matrix([[1.0, 0.0] for _ in texts])

    class ClassifierDouble:
        classes_ = np.array(["role_a", "role_b"])
        named_steps = {"tfidf": VectorizerDouble()}

        def predict_proba(self, texts):
            return np.array([[0.75, 0.25] for _ in texts])

    dataset = Dataset.model_validate(contract_fixture())
    skills = [skill.model_dump() for skill in dataset.skills]
    skills[1]["aliases"] = ["Alias B"]
    roles = [role.model_dump() for role in dataset.roles]
    roles[0]["requirements"].append(
        {"skill_id": "skill_a", "level": 2, "weight": 1, "required": True}
    )
    predictor = Predictor(
        {
            "model_version": "unit-test-only",
            "pipeline": ClassifierDouble(),
            "skills": skills,
            "roles": roles,
            "metadata": {"dataset_version": "unit-test-only"},
        }
    )
    output = predictor.predict(
        {"skills": [{"name": "Alias B", "level": 3}, {"name": "Unknown", "level": 4}]}, {}
    )
    result = output["roles"][0]
    assert result["role_id"] == "role_a"
    assert result["compatibility_score"] == 50.0
    assert result["strengths"][0]["skill_id"] == "skill_b"
    assert result["skill_gaps"][0]["basis"] == "not_assessed"
    assert result["recommendations"][0]["skill_id"] == "skill_a"
    assert output["unrecognized_skills"] == ["Unknown"]
    assert output["evaluation"]["test_accuracy"] is None
    assert output["evaluation"]["student_evaluation_available"] is False
    predictor.metadata.update(
        {
            "test": {"accuracy": 0.06, "macro_f1": 0.06, "top_3_accuracy": 0.22},
            "majority_baseline_test": {"accuracy": 0.19},
        }
    )
    result = predictor.predict({"skills": []}, {})
    assert result["evaluation"]["status"] == "below_majority_baseline"
    assert result["evaluation"]["test_accuracy"] == 0.06
    assert any("most common role" in message for message in result["limitations"])
