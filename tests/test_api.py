from concurrent.futures import ThreadPoolExecutor

import pytest

from tests.conftest import complete_attempt


def test_health_and_no_model(client):
    assert client.get("/health/live").status_code == 200
    assert client.get("/health/ready").status_code == 200
    assert client.get("/health/model").status_code == 503
    assert client.get("/api/v1/profiles/me").status_code == 401


def test_registration_validation_and_unique_email(client):
    body = {"email": "Student@example.com", "password": "a-long-secure-password"}
    assert client.post("/api/v1/auth/register", json=body).status_code == 201
    body["email"] = "student@example.com"
    assert client.post("/api/v1/auth/register", json=body).status_code == 409
    body["password"] = "wrong-but-long-password"
    assert client.post("/api/v1/auth/login", json=body).status_code == 401
    assert (
        client.post(
            "/api/v1/auth/register", json={"email": "invalid", "password": "short"}
        ).status_code
        == 422
    )


def test_refresh_rotation_logout_and_origin(auth):
    old = auth.cookies.get("refresh_token")
    assert (
        auth.post(
            "/api/v1/auth/refresh", headers={"Origin": "https://untrusted.example"}
        ).status_code
        == 403
    )
    refreshed = auth.post("/api/v1/auth/refresh", headers={"Origin": "http://localhost:3000"})
    assert refreshed.status_code == 200
    assert "HttpOnly" in refreshed.headers["set-cookie"]
    new = auth.cookies.get("refresh_token")
    assert new != old
    auth.cookies.clear()
    auth.cookies.set("refresh_token", old)
    assert auth.post("/api/v1/auth/refresh").status_code == 401
    auth.cookies.set("refresh_token", new)
    assert auth.post("/api/v1/auth/logout").status_code == 204
    auth.cookies.set("refresh_token", new)
    assert auth.post("/api/v1/auth/refresh").status_code == 401


def test_login_origin_and_validation_do_not_echo_password(client):
    credentials = {"email": "person@example.com", "password": "private-password-1234"}
    assert (
        client.post(
            "/api/v1/auth/login", json=credentials, headers={"Origin": "https://untrusted.example"}
        ).status_code
        == 403
    )
    response = client.post("/api/v1/auth/register", json={"email": "invalid", "password": "secret"})
    assert response.status_code == 422
    assert "secret" not in response.text


def test_refresh_token_consumed_only_once(auth):
    token = auth.cookies.get("refresh_token")
    auth.cookies.clear()
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(
            pool.map(
                lambda _: auth.post(
                    "/api/v1/auth/refresh", headers={"Cookie": f"refresh_token={token}"}
                ),
                range(2),
            )
        )
    assert sorted(response.status_code for response in results) == [200, 401]


def test_profile_required_and_validated(auth, profile):
    assert auth.post("/api/v1/assessments/attempts").status_code == 409
    profile["skills"][0]["level"] = 5
    assert auth.put("/api/v1/profiles/me", json=profile).status_code == 422
    profile["skills"][0]["level"] = 2
    profile["skills"].append(profile["skills"][0].copy())
    assert auth.put("/api/v1/profiles/me", json=profile).status_code == 422


def test_assessment_completion_and_missing_model(auth, profile):
    result = complete_attempt(auth, profile)
    assert result["status"] == "completed"
    assert result["summary"]["scenario_total"] == 6
    assert all(
        "correct" not in q and "explanation" not in q for q in result["assessment"]["questions"]
    )
    id = result["id"]
    assert auth.post(f"/api/v1/assessments/attempts/{id}/complete").json() == result
    assert (
        auth.put(
            f"/api/v1/assessments/attempts/{id}/answers",
            json={"answers": [{"question_id": "track", "value": "cloud"}]},
        ).status_code
        == 409
    )
    response = auth.post(f"/api/v1/career-results/{id}")
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "model_unavailable"
    assert auth.get(f"/api/v1/career-results/{id}").status_code == 404
    assert auth.get("/api/v1/skills").json() == []
    assert auth.get("/api/v1/job-roles").json() == []


def test_snapshots_and_branch_changes(auth, profile):
    auth.put("/api/v1/profiles/me", json=profile)
    attempt = auth.post("/api/v1/assessments/attempts").json()
    id = attempt["id"]
    profile["display_name"] = "Changed after starting"
    auth.put("/api/v1/profiles/me", json=profile)
    assert (
        auth.get(f"/api/v1/assessments/attempts/{id}").json()["profile_snapshot"]["display_name"]
        == "Test Student"
    )
    response = auth.post(f"/api/v1/assessments/attempts/{id}/complete")
    assert response.status_code == 422
    assert "track" in response.json()["detail"]["question_ids"]
    path = f"/api/v1/assessments/attempts/{id}/answers"
    response = auth.put(
        path,
        json={
            "answers": [
                {"question_id": "track", "value": "data"},
                {"question_id": "data_split", "value": "group"},
            ]
        },
    )
    assert response.json()["answers"]["data_split"] == "group"
    response = auth.put(path, json={"answers": [{"question_id": "track", "value": "software"}]})
    assert "data_split" not in response.json()["answers"]
    assert (
        auth.put(
            path, json={"answers": [{"question_id": "track", "value": "nonexistent"}]}
        ).status_code
        == 422
    )
    assert (
        auth.put(
            path, json={"answers": [{"question_id": "project_evidence", "value": ["wrong type"]}]}
        ).status_code
        == 422
    )
    assert auth.post(f"/api/v1/career-results/{id}").status_code == 409


def test_ownership_and_account_deletion(auth, profile):
    attempt = complete_attempt(auth, profile)
    token = auth.headers["Authorization"]
    credentials = {"email": "other@example.com", "password": "another-long-password"}
    auth.post("/api/v1/auth/register", json=credentials)
    other = auth.post("/api/v1/auth/login", json=credentials).json()["access_token"]
    auth.headers["Authorization"] = f"Bearer {other}"
    assert auth.get(f"/api/v1/assessments/attempts/{attempt['id']}").status_code == 404
    assert auth.post(f"/api/v1/career-results/{attempt['id']}").status_code == 404
    auth.headers["Authorization"] = token
    assert auth.delete("/api/v1/auth/me").status_code == 204
    assert auth.get("/api/v1/auth/me").status_code == 401


def test_prediction_persistence(auth, profile, monkeypatch):
    # Contract double only: never installed in the application or used for training.
    class PredictorDouble:
        version = "test-only"

        def predict(self, profile, answers):
            return {
                "model_version": self.version,
                "roles": [],
                "evidence": profile["project_summary"],
            }

    monkeypatch.setattr("app.routes.get_predictor", lambda: PredictorDouble())
    attempt = complete_attempt(auth, profile)
    path = f"/api/v1/career-results/{attempt['id']}"
    response = auth.post(path)
    assert response.status_code == 200
    assert response.json()["assessment_version"] == attempt["assessment_version"]
    assert auth.get(path).json() == response.json()
    assert auth.post(path).json() == response.json()


@pytest.mark.parametrize("answer", [True, 3, [], "   "])
def test_text_answer_rejects_invalid_value(auth, profile, answer):
    auth.put("/api/v1/profiles/me", json=profile)
    id = auth.post("/api/v1/assessments/attempts").json()["id"]
    response = auth.put(
        f"/api/v1/assessments/attempts/{id}/answers",
        json={"answers": [{"question_id": "project_evidence", "value": answer}]},
    )
    assert response.status_code == 422
