import os
import secrets

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

os.environ["JWT_SECRET"] = secrets.token_urlsafe(48)
os.environ["DATABASE_URL"] = "sqlite://"

from app.config import get_settings  # noqa: E402
from app.db import get_engine  # noqa: E402
from app.main import create_app  # noqa: E402


@pytest.fixture
def client(tmp_path, monkeypatch):
    # An optional dedicated PostgreSQL test DB runs the same suite against PostgreSQL.
    database = os.environ.get("TEST_DATABASE_URL", f"sqlite:///{tmp_path / 'test.db'}")
    monkeypatch.setenv("DATABASE_URL", database)
    monkeypatch.setenv("MODEL_PATH", str(tmp_path / "missing.joblib"))
    get_settings.cache_clear()
    get_engine.cache_clear()
    config = Config("alembic.ini")
    command.upgrade(config, "head")
    with TestClient(create_app()) as test_client:
        yield test_client
    command.downgrade(config, "base")
    get_engine().dispose()
    get_engine.cache_clear()
    get_settings.cache_clear()


@pytest.fixture
def auth(client):
    credentials = {"email": "student@example.com", "password": "test-password-with-entropy"}
    assert client.post("/api/v1/auth/register", json=credentials).status_code == 201
    response = client.post("/api/v1/auth/login", json=credentials)
    assert response.status_code == 200
    client.headers["Authorization"] = f"Bearer {response.json()['access_token']}"
    return client


@pytest.fixture
def profile():
    return {
        "display_name": "Test Student",
        "education_level": "undergraduate",
        "project_summary": "Built a Python service and validated its database queries.",
        "skills": [{"name": "Python", "level": 2, "evidence": "Course project"}],
        "desired_roles": ["Data Analyst"],
    }


def complete_attempt(client, profile):
    assert client.put("/api/v1/profiles/me", json=profile).status_code == 200
    attempt = client.post("/api/v1/assessments/attempts").json()
    answers = []
    for q in attempt["assessment"]["questions"]:
        if "when" in q and "data" not in q["when"]["values"]:
            continue
        value = (
            "data"
            if q["id"] == "track"
            else q["options"][0]["value"]
            if q["type"] == "single"
            else "Independent Python project evidence"
        )
        answers.append({"question_id": q["id"], "value": value})
    assert (
        client.put(
            f"/api/v1/assessments/attempts/{attempt['id']}/answers", json={"answers": answers}
        ).status_code
        == 200
    )
    response = client.post(f"/api/v1/assessments/attempts/{attempt['id']}/complete")
    assert response.status_code == 200
    return response.json()
