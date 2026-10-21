# SkillGap AI backend

FastAPI backend for career profiles, a versioned skills assessment, and dataset-driven career recommendations. Python 3.12+, PostgreSQL 16, SQLAlchemy, Alembic and scikit-learn.

The application starts with **empty skill/job catalogs and no trained model**. No sample users, dataset records, quiz seeds, or placeholder predictions are inserted. The authored assessment is versioned source content in `app/assessment.py`, served directly and snapshotted with each attempt. It requires no database seeding or paid AI API.

## Start locally

Install Python 3.12+, [uv](https://docs.astral.sh/uv/) and Docker with Compose. From this directory:

```sh
uv sync --frozen --extra dev
python scripts/bootstrap_env.py
docker compose up -d db
uv run alembic upgrade head
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The bootstrap command creates a private, ignored `.env` with a random JWT signing key. It preserves any existing `.env`. If configuring manually, copy `.env.example`, generate a signing key of at least 32 characters, and set `JWT_SECRET`. Never commit `.env`.

Alternatively, run the full Docker stack:

```sh
python scripts/bootstrap_env.py
docker compose up --build -d --wait
```

In this cloud workspace, Docker build containers need the existing platform proxy and CA bundle. Use `python scripts/build_cloud_image.py` followed by `docker compose up -d --no-build --wait` if the regular build reports DNS/proxy errors. The helper resolves the existing proxy hostname and mounts the existing CA only for build steps; TLS verification stays enabled and credentials are not copied into the image.

API documentation is at `/docs`, and the OpenAPI schema is at `/openapi.json`. `/health/live` verifies the process; `/health/ready` verifies database schema access. `/health/model` returns 503 until a usable model is installed. Model availability does not block registration or assessments.

For development without Docker, configure `DATABASE_URL=sqlite:///./skillgap.db` and run migrations. PostgreSQL is the supported multi-worker deployment database; SQLite is suitable for a single-process local workflow and tests.

## Frontend integration

All business endpoints use `/api/v1`. The intended sequence is:

1. `POST /auth/register` with `email` and a 12–128-character `password`.
2. `POST /auth/login` with those credentials. Keep the returned access token in memory and send `Authorization: Bearer <token>` on protected calls.
3. `PUT /profiles/me` with the structured profile. Levels are 0: no experience, 1: guided basics, 2: routine tasks with help, 3: independent delivery, 4: design/review expertise. All are self-reported.
4. `POST /assessments/attempts` to snapshot the profile and current assessment. Render its public question definitions. Honor `when` conditions and `required` flags.
5. `PUT /assessments/attempts/{id}/answers` with `{"answers": [{"question_id": "...", "value": "..."}]}`. This merges answers and supports save/resume. Changing tracks clears inapplicable scenario responses.
6. `POST /assessments/attempts/{id}/complete` validates required answers, freezes the attempt and returns scenario feedback. Repeating completion is safe.
7. `POST /career-results/{id}` generates and saves one result after a trained model is installed. Until then it returns **503 `model_unavailable`**. `GET /career-results/{id}` reads an existing result and returns 404 when none exists. To reassess under a new model, create a new attempt.

`GET /assessments/attempts` lists the user's attempts with `offset` pagination, 50 per page. `GET /assessments/attempts/{id}` returns a resumable snapshot. `GET /assessments/current` previews the current question set. `GET /skills` and `GET /job-roles` return imported catalogs, initially empty.

Refresh tokens are opaque, hashed in the database, and rotated atomically by `POST /auth/refresh`. They are sent in an HttpOnly, SameSite=Lax cookie scoped to `/api/v1/auth`. Use `credentials: "include"` on login, refresh and logout requests. Register explicit frontend origins in `CORS_ORIGINS`. Deploy frontend/API on the same site; a cross-site cookie deployment requires an explicit CSRF and cookie-policy design. `POST /auth/logout` revokes the current refresh token; existing access tokens expire within 15 minutes. `DELETE /auth/me` deletes the account and cascades its profiles, attempts, results and refresh sessions.

Passwords use Argon2id. Access tokens check issuer, audience, signature, expiry and token type. Attempt and result access is restricted to the owner. Validation errors omit raw inputs. For public deployment, configure HTTPS, `ENVIRONMENT=production`, `COOKIE_SECURE=true`, private database credentials, backups and gateway rate limits for login/registration. Email verification, password reset and a distributed abuse limiter are outside this first version.

## Real datasets and training

See [the dataset contract](docs/dataset-contract.md) before your teammate finalizes exports. The application consumes one versioned JSON bundle containing skill taxonomy, role requirements, job descriptions and optional independently labeled student profiles. JSON Schema can be printed with:

```sh
uv run skillgap-data schema
uv run skillgap-data validate data/dataset.json
uv run skillgap-data import data/dataset.json
uv run skillgap-data train data/dataset.json --output artifacts/baseline-v1.joblib
```

The import command transactionally upserts only the skill and role catalogs; source job/student records stay in the private dataset file. Re-importing the same catalog is safe. It does not remove old catalog entries. Keep versions in separate source files and review catalog removals explicitly.

Training is a separate offline command and never runs at API startup. It fits TF-IDF + logistic regression, tunes regularization on a validation partition, and evaluates once on a disjoint test partition. It requires at least five independent groups per role and rejects missing classes in a partition. This is a structural minimum, not enough data to establish useful accuracy. The CLI writes a model and a checksum/metrics manifest. It refuses to overwrite an existing output.

After reviewing evaluation results, set `MODEL_PATH=artifacts/baseline-v1.joblib` in `.env` and restart the API. Keep the matching `.json` manifest alongside the model. Only load artifacts created by trusted training code: joblib is executable serialization; a checksum detects corruption, not a malicious trusted-file replacement. No model is trained or installed by default.

The classifier ranks roles using evidence text, excluding selected target roles and personal identifiers. Similarity is reported separately. Compatibility is weighted required-skill coverage from reported proficiency; absent skills mean unassessed. Recommendations put prerequisite skills first. Job-text evaluation does not prove career prediction accuracy for students. See [assessment design](docs/assessment-design.md) for interpretation and validation work.

## Verification

```sh
uv run ruff check .
uv run ruff format --check .
uv run pytest -q
uv run alembic check
uv run python scripts/smoke.py
```

The smoke command requires a running API and creates then deletes a temporary account and assessment. It does not add dataset records or train a model.

Tests use temporary SQLite databases by default and contain isolated unit-test fixtures/doubles only; they do not seed the application, train a deployable model, or populate production catalogs. To verify against PostgreSQL, create a **dedicated disposable test database**, then:

```sh
docker compose exec -T db createdb -U skillgap skillgap_test
TEST_DATABASE_URL=postgresql+psycopg://skillgap:skillgap_local@localhost:5432/skillgap_test uv run pytest -q
```

**The test suite upgrades and downgrades its selected database for each API test. Never point `TEST_DATABASE_URL` at your application database.** Tests exercise token rotation, account ownership, profile validation, assessment branching/immutability, missing-model behavior, dataset references and artifact checksum checks. Model accuracy remains unverified until real data is supplied.

## Layout

```text
app/                 API, auth, database models, assessment and inference
training/            Dataset contract, import and offline training CLI
migrations/          Alembic schema migrations
tests/               API and ML-contract tests
docs/                Dataset and assessment documentation
scripts/             Safe local environment bootstrap
data/                Ignored private dataset files
artifacts/           Ignored trusted model files and manifests
```
