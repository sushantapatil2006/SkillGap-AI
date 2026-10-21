"""Create a private local .env once, without printing or overwriting secrets."""

import os
import secrets
from pathlib import Path

root = Path(__file__).resolve().parents[1]
target = root / ".env"
try:
    descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
except FileExistsError:
    print("Existing .env preserved. Check that JWT_SECRET is set before starting.")
else:
    with os.fdopen(descriptor, "w") as file:
        file.write(
            "JWT_SECRET=" + secrets.token_urlsafe(48) + "\n"
            "DATABASE_URL=postgresql+psycopg://skillgap:skillgap_local@localhost:5432/skillgap\n"
            'CORS_ORIGINS=["http://localhost:3000"]\n'
            "MODEL_PATH=artifacts/model.joblib\n"
            "COOKIE_SECURE=false\n"
            "ENVIRONMENT=development\n"
        )
    print("Created private local .env. No secret values were printed.")
