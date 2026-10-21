"""Exercise a running API and delete the temporary account on completion."""

import secrets
import sys
from uuid import uuid4

import httpx

base_url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
with httpx.Client(base_url=base_url, timeout=20) as client:
    client.get("/health/ready").raise_for_status()
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
            "project_summary": "Temporary API workflow check; not training evidence.",
            "skills": [],
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
            assert response.json()["detail"]["code"] == "model_unavailable"
            print("Career results correctly report model/evidence unavailable.")
        else:
            response.raise_for_status()
            assert response.json()["model_version"]
            print("Career results endpoint returned a versioned model result.")
        print(
            "Passed: readiness, registration, login, profile, assessment save/completion and result behavior."
        )
    finally:
        client.delete("/api/v1/auth/me").raise_for_status()
        print("Temporary account and assessment records removed.")
