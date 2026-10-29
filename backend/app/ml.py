import hashlib
import json
import logging
import re
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from app.config import get_settings

logger = logging.getLogger("skillgap.ml")


class ModelUnavailable(Exception):
    pass


def learning_plan(skills, claims, gaps):
    roadmap, scheduled = [], set()
    targets = {gap["skill_id"]: gap["required_level"] for gap in gaps}

    def recommend(id, reason):
        target = targets.get(id, 1)
        if id in scheduled or claims.get(id, 0) >= target:
            return
        for prerequisite in skills[id]["prerequisites"]:
            recommend(prerequisite, f"Foundation for {skills[id]['name']}")
        scheduled.add(id)
        roadmap.append(
            {
                "skill_id": id,
                "name": skills[id]["name"],
                "target_level": target,
                "reason": reason,
                "next_action": "Practice with a relevant task, retain evidence and reassess proficiency.",
            }
        )

    for gap in gaps:
        recommend(
            gap["skill_id"], "Required skill gap" if gap["required"] else "Optional skill gap"
        )
    return roadmap


def profile_text(profile, answers=None):
    answers = answers or {}
    # Preferences, qualifications, names and constraints are deliberately excluded.
    pieces = [profile.get("experience_summary", ""), profile.get("project_summary", "")]
    for skill in profile.get("skills", []):
        if skill["level"] > 0:
            pieces.extend([skill["name"], skill.get("evidence", "")])
    pieces.extend(answers.get(key, "") for key in ("project_evidence", "skill_evidence"))
    return " ".join(pieces).strip()


class Predictor:
    def __init__(self, artifact):
        self.version = artifact["model_version"]
        self.pipeline = artifact["pipeline"]
        self.skills = {s["id"]: s for s in artifact["skills"]}
        self.roles = {r["id"]: r for r in artifact["roles"]}
        self.metadata = artifact["metadata"]
        if set(self.pipeline.classes_) != set(self.roles):
            raise ValueError("Model classes and role catalog differ")
        self.aliases = {}
        for skill in self.skills.values():
            for name in [skill["name"], *skill["aliases"]]:
                self.aliases[name.casefold()] = skill["id"]

        common_aliases = {
            "pytorch": "deep_learning",
            "torch": "deep_learning",
            "tensorflow": "deep_learning",
            "tf": "deep_learning",
            "keras": "deep_learning",
            "neural networks": "deep_learning",
            "scikit-learn": "machine_learning",
            "sklearn": "machine_learning",
            "ml": "machine_learning",
            "xgboost": "machine_learning",
            "lightgbm": "machine_learning",
            "postgresql": "sql",
            "postgres": "sql",
            "mysql": "sql",
            "sqlite": "sql",
            "sql server": "sql",
            "mssql": "sql",
            "oracle": "sql",
            "mariadb": "sql",
            "plsql": "sql",
            "tsql": "sql",
            "python3": "python",
            "py": "python",
            "pandas": "data_analysis",
            "numpy": "data_analysis",
            "scipy": "data_analysis",
            "excel": "data_analysis",
            "data analytics": "data_analysis",
            "tableau": "data_visualization",
            "power bi": "data_visualization",
            "powerbi": "data_visualization",
            "matplotlib": "data_visualization",
            "seaborn": "data_visualization",
            "plotly": "data_visualization",
            "aws": "cloud_computing",
            "azure": "cloud_computing",
            "gcp": "cloud_computing",
            "google cloud": "cloud_computing",
            "snowflake": "data_warehousing",
            "redshift": "data_warehousing",
            "bigquery": "data_warehousing",
            "teradata": "data_warehousing",
            "kafka": "apache_kafka",
            "pyspark": "spark",
            "airflow": "data_pipelines",
            "etl": "etl_extract_transform_load",
            "nlp": "natural_language_processing_nlp",
            "llm": "natural_language_processing_nlp",
            "transformers": "natural_language_processing_nlp",
            "huggingface": "natural_language_processing_nlp",
            "dbt": "data_transformation",
            "docker": "data_engineering",
            "kubernetes": "data_engineering",
            "k8s": "data_engineering",
            "software development": "data_engineering",
            "software engineering": "data_engineering",
            "coding": "python",
        }
        for alias, skill_id in common_aliases.items():
            if skill_id in self.skills and alias not in self.aliases:
                self.aliases[alias] = skill_id

    def evaluation_summary(self):
        test = self.metadata.get("test", {})
        baseline = self.metadata.get("majority_baseline_test", {})
        below_baseline = (
            test.get("accuracy") is not None
            and baseline.get("accuracy") is not None
            and test["accuracy"] <= baseline["accuracy"]
        )
        return {
            "status": "below_majority_baseline"
            if below_baseline
            else "student_validity_unestablished",
            "intended_use": "course_demo",
            "test_accuracy": test.get("accuracy"),
            "test_macro_f1": test.get("macro_f1"),
            "test_top_3_accuracy": test.get("top_3_accuracy"),
            "majority_baseline_accuracy": baseline.get("accuracy"),
            "student_evaluation_available": self.metadata.get("student_evaluation") is not None,
        }

    def predict(self, profile, answers):
        text = profile_text(profile, answers)
        extra_terms = []
        for claim in profile.get("skills", []):
            mapped_id = self.aliases.get(claim.get("name", "").casefold())
            if mapped_id and mapped_id in self.skills:
                extra_terms.append(self.skills[mapped_id]["name"])
        if extra_terms:
            text = f"{text} {' '.join(extra_terms)}".strip()
        vector = self.pipeline.named_steps["tfidf"].transform([text])
        if not vector.nnz:
            raise ModelUnavailable(
                "Profile evidence has no recognized model vocabulary; add concrete skills and project evidence"
            )
        scores = self.pipeline.predict_proba([text])[0]
        indices = np.argsort(-scores)[:3]
        claims, unknown = {}, []
        for claim in profile["skills"]:
            id = self.aliases.get(claim["name"].casefold())
            if id:
                claims[id] = max(claims.get(id, 0), claim["level"])
            else:
                unknown.append(claim["name"])
        mentioned = set()
        for alias, id in self.aliases.items():
            if re.search(r"(?<!\w)" + re.escape(alias) + r"(?!\w)", text, flags=re.IGNORECASE):
                mentioned.add(id)
        results = []
        for index in indices:
            role = self.roles[str(self.pipeline.classes_[index])]
            weighted, total = 0.0, 0.0
            gaps, strengths = [], []
            required_requirements = [req for req in role["requirements"] if req.get("required")]
            top_5_required_ids = {req["skill_id"] for req in required_requirements[:5]}
            for requirement in role["requirements"]:
                id = requirement["skill_id"]
                level = claims.get(id, 0)
                target = requirement["level"]
                is_required = id in top_5_required_ids
                if is_required:
                    weighted += requirement["weight"] * min(level / target, 1)
                    total += requirement["weight"]
                if level >= target:
                    strengths.append(
                        {"skill_id": id, "name": self.skills[id]["name"], "basis": "self_reported"}
                    )
                else:
                    gaps.append(
                        {
                            "skill_id": id,
                            "name": self.skills[id]["name"],
                            "reported_level": level,
                            "required_level": target,
                            "gap": target - level,
                            "required": is_required,
                            "priority_score": round(
                                requirement["weight"] * (target - level) / target, 4
                            ),
                            "mentioned_in_evidence": id in mentioned,
                            "basis": "self_reported" if id in claims else "not_assessed",
                            "prerequisites": self.skills[id]["prerequisites"],
                        }
                    )
            gaps.sort(key=lambda gap: (not gap["required"], -gap["priority_score"]))
            roadmap = learning_plan(self.skills, claims, gaps)
            role_vector = self.pipeline.named_steps["tfidf"].transform([role["description"]])
            compat_score = round(100 * weighted / total, 1) if total > 0 else 0.0
            results.append(
                {
                    "rank": len(results) + 1,
                    "role_id": role["id"],
                    "title": role["title"],
                    "role_title": role["title"],
                    "model_score": round(float(scores[index]), 4),
                    "text_similarity": round(
                        float(cosine_similarity(vector, role_vector)[0, 0]), 4
                    ),
                    "compatibility_score": compat_score,
                    "compatibility": compat_score,
                    "strengths": strengths,
                    "skill_gaps": gaps,
                    "gaps": gaps,
                    "recommendations": roadmap,
                    "learning_plan": roadmap,
                }
            )
        return {
            "model_version": self.version,
            "dataset_version": self.metadata["dataset_version"],
            "evaluation": self.evaluation_summary(),
            "dataset_provenance": self.metadata.get("provenance"),
            "roles": results,
            "recommendations": results,
            "unrecognized_skills": unknown,
            "preferences": {
                "desired_roles": profile.get("desired_roles", []),
                "assessment_track": answers.get("track"),
                "weekly_time_budget": answers.get("time_budget"),
            },
            "limitations": [
                *(
                    [
                        "This model's test accuracy was lower than always predicting the most common role. Treat its rankings as a course demonstration, not reliable career advice."
                    ]
                    if self.evaluation_summary()["status"] == "below_majority_baseline"
                    else []
                ),
                "Dataset-derived role requirements and proficiency targets are provisional; they have not been independently validated.",
                "Model scores are uncalibrated ranking signals, not probabilities of getting hired.",
                "Job-text classification may not generalize to student profiles; review held-out student evaluation before use in career decisions.",
                "Scenario scores provide separate evidence and do not establish technical mastery.",
                "Learning order uses dataset prerequisites; no learning-duration or employability guarantee is made.",
            ],
        }


@lru_cache(maxsize=1)
def load_predictor(path: str, modified_ns: int, manifest_modified_ns: int):
    model_path = Path(path)
    manifest = json.loads(model_path.with_suffix(".json").read_text())
    if hashlib.sha256(model_path.read_bytes()).hexdigest() != manifest["sha256"]:
        raise ValueError("Artifact checksum mismatch")
    # joblib can execute code: only the trusted local training CLI may produce artifacts.
    artifact = joblib.load(model_path)
    if (
        artifact["schema_version"] != "1.0"
        or artifact["model_version"] != manifest["model_version"]
    ):
        raise ValueError("Incompatible artifact")
    return Predictor(artifact)


def get_predictor():
    path = get_settings().model_path
    try:
        return load_predictor(
            str(path.resolve()),
            path.stat().st_mtime_ns,
            path.with_suffix(".json").stat().st_mtime_ns,
        )
    except Exception as exc:
        logger.warning("Model unavailable (%s)", type(exc).__name__)
        raise ModelUnavailable(
            "No usable trained model is installed. Import the real dataset, train and install its artifact."
        ) from None
