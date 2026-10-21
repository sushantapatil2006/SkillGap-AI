import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import Depends, HTTPException, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models import RefreshSession, User

hasher = PasswordHasher()
bearer = HTTPBearer(auto_error=False)
# Equal-cost verification for unknown users.
dummy_hash = hasher.hash(secrets.token_urlsafe(32))


def password_matches(encoded: str, password: str) -> bool:
    try:
        return hasher.verify(encoded, password)
    except VerificationError:
        return False


def token_hash(token: str):
    return hashlib.sha256(token.encode()).hexdigest()


def issue_tokens(user: User, response: Response, db: Session):
    settings = get_settings()
    now = datetime.now(UTC)
    expires = now + timedelta(minutes=settings.access_token_minutes)
    access = jwt.encode(
        {
            "sub": user.id,
            "iat": now,
            "exp": expires,
            "iss": "skillgap",
            "aud": "skillgap-api",
            "type": "access",
        },
        settings.jwt_secret.get_secret_value(),
        algorithm="HS256",
    )
    refresh = secrets.token_urlsafe(48)
    db.add(
        RefreshSession(
            token_hash=token_hash(refresh),
            user_id=user.id,
            expires_at=now + timedelta(days=settings.refresh_token_days),
        )
    )
    db.commit()
    response.set_cookie(
        "refresh_token",
        refresh,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/api/v1/auth",
        max_age=settings.refresh_token_days * 86400,
    )
    response.headers["Cache-Control"] = "no-store"
    return {
        "access_token": access,
        "token_type": "bearer",
        "expires_in": settings.access_token_minutes * 60,
    }


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        401, "Invalid or expired access token", headers={"WWW-Authenticate": "Bearer"}
    )
    if not credentials:
        raise unauthorized
    try:
        payload = jwt.decode(
            credentials.credentials,
            get_settings().jwt_secret.get_secret_value(),
            algorithms=["HS256"],
            issuer="skillgap",
            audience="skillgap-api",
            options={"require": ["exp", "iat", "sub", "type"]},
        )
        if payload["type"] != "access":
            raise unauthorized
        user = db.get(User, payload["sub"])
        if not user:
            raise unauthorized
        return user
    except jwt.InvalidTokenError:
        raise unauthorized from None


def check_cookie_origin(request: Request):
    # Browsers attach Origin to cross-origin POSTs. CLI callers need no Origin.
    origin = request.headers.get("origin")
    if origin and origin not in get_settings().cors_origins:
        raise HTTPException(403, "Origin is not allowed")
    if request.headers.get("sec-fetch-site") == "cross-site":
        raise HTTPException(403, "Cross-site cookie requests are not allowed")
