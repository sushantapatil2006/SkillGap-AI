"""Exercise a running API and delete the temporary account on completion."""

import argparse
import secrets
from uuid import uuid4

import httpx

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("base_url", nargs="?", default="http://127.0.0.1:8000")
parser.add_argument(
    "--require-model", action="store_true", help="Fail unless actual model inference succeeds"
)
arguments = parser.parse_args()
base_url = arguments.base_url
with httpx.Client(base_url=base_url, timeout=20) as client:
    client.get("/health/ready").raise_for_status()
    if arguments.require_model:
        health = client.get("/health/model")
        health.raise_for_status()
        expected_model = health.json()["version"]
    credentials = {
        "email": f"smoke-{uuid4().hex}@example.com",
        "password": secrets.token_urlsafe(24),
    }
    client.post("/api/v1/auth/register", json=credentials).raise_for_status()
    response = client.post("/api/v1/auth/login", json=credentials)
    response.raise_for_status()
    client.headers["Authorization"] = f"Bearer {response.json()['access_token']}"
    try:
        profile = {
            "display_name": "Temporary smoke check",
            "education_level": "undergraduate",
            "project_summary": "Temporary verification profile: Python and SQL data analysis project, tested ETL pipelines and reporting. Not training data.",
            "skills": [
                {"name": "Python", "level": 2},
                {"name": "SQL", "level": 3},
                {"name": "Data Analysis", "level": 2},
            ],
        }
        client.put("/api/v1/profiles/me", json=profile).raise_for_status()
        response = client.post("/api/v1/assessments/attempts")
        response.raise_for_status()
        attempt = response.json()
        answers = []
        for question in attempt["assessment"]["questions"]:
            if "when" in question and "data" not in question["when"]["values"]:
                continue
            if question["id"] == "track":
                value = "data"
            elif question["type"] == "single":
                value = question["options"][0]["value"]
            else:
                value = "Temporary API workflow check; not training evidence."
            answers.append({"question_id": question["id"], "value": value})
        path = f"/api/v1/assessments/attempts/{attempt['id']}"
        client.put(path + "/answers", json={"answers": answers}).raise_for_status()
        response = client.post(path + "/complete")
        response.raise_for_status()
        assert response.json()["status"] == "completed"
        assert response.json()["summary"]["scenario_total"] == 6
        response = client.post(f"/api/v1/career-results/{attempt['id']}")
        if response.status_code == 503:
            assert not arguments.require_model, "Model inference required but returned 503"
            assert response.json()["detail"]["code"] == "model_unavailable"
            print("Career results correctly report model/evidence unavailable.")
        else:
            response.raise_for_status()
            assert response.json()["model_version"]
            if arguments.require_model:
                result = response.json()
                assert result["model_version"] == expected_model
                assert len(result["roles"]) == 3
                assert "evaluation" in result
                for role in result["roles"]:
                    assert 0 <= role["compatibility_score"] <= 100
                    assert 0 <= role["model_score"] <= 1
                    assert role["skill_gaps"] and role["recommendations"]
                result_path = f"/api/v1/career-results/{attempt['id']}"
                assert client.get(result_path).json() == result
                assert client.post(result_path).json() == result
                assert client.get("/api/v1/skills").json()
                assert client.get("/api/v1/job-roles").json()
            print("Career results endpoint returned a versioned model result.")
        print(
            "Passed: readiness, registration, login, profile, assessment save/completion and result behavior."
        )
    finally:
        client.delete("/api/v1/auth/me").raise_for_status()
        print("Temporary account and assessment records removed.")
