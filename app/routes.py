from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import assessment
from app.db import get_db
from app.ml import ModelUnavailable, get_predictor
from app.models import Attempt, JobRole, Prediction, Profile, RefreshSession, Skill, User
from app.schemas import AnswerBatch, Credentials, ProfileInput
from app.security import (
    check_cookie_origin,
    current_user,
    dummy_hash,
    hasher,
    issue_tokens,
    password_matches,
    token_hash,
)

router = APIRouter(prefix="/api/v1")


@router.post("/auth/register", status_code=201, tags=["auth"])
def register(body: Credentials, db: Session = Depends(get_db)):
    user = User(email=str(body.email), password_hash=hasher.hash(body.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account with this email already exists") from None
    return {"id": user.id, "email": user.email}


@router.post("/auth/login", tags=["auth"])
def login(body: Credentials, request: Request, response: Response, db: Session = Depends(get_db)):
    check_cookie_origin(request)
    user = db.scalar(select(User).where(User.email == str(body.email)))
    valid = password_matches(user.password_hash if user else dummy_hash, body.password)
    if not user or not valid:
        raise HTTPException(401, "Invalid email or password")
    return issue_tokens(user, response, db)


@router.post("/auth/refresh", tags=["auth"])
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    check_cookie_origin(request)
    token = request.cookies.get("refresh_token", "")
    # DELETE RETURNING consumes a refresh token atomically across API workers.
    user_id = db.scalar(
        delete(RefreshSession)
        .where(
            RefreshSession.token_hash == token_hash(token),
            RefreshSession.expires_at > datetime.now(UTC),
        )
        .returning(RefreshSession.user_id)
    )
    if not user_id:
        raise HTTPException(401, "Invalid or expired refresh token")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(401, "Account no longer exists")
    return issue_tokens(user, response, db)


@router.post("/auth/logout", status_code=204, tags=["auth"])
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    check_cookie_origin(request)
    db.execute(
        delete(RefreshSession).where(
            RefreshSession.token_hash == token_hash(request.cookies.get("refresh_token", ""))
        )
    )
    db.commit()
    response.delete_cookie("refresh_token", path="/api/v1/auth")


@router.get("/auth/me", tags=["auth"])
def me(user: User = Depends(current_user)):
    return {"id": user.id, "email": user.email}


@router.delete("/auth/me", status_code=204, tags=["auth"])
def delete_account(
    response: Response, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    db.delete(user)
    db.commit()
    response.delete_cookie("refresh_token", path="/api/v1/auth")


@router.put("/profiles/me", tags=["profiles"])
def put_profile(
    body: ProfileInput, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    profile = db.get(Profile, user.id)
    if not profile:
        profile = Profile(user_id=user.id)
        db.add(profile)
    profile.data = body.model_dump()
    db.commit()
    return profile.data


@router.get("/profiles/me", tags=["profiles"])
def get_profile(user: User = Depends(current_user), db: Session = Depends(get_db)):
    profile = db.get(Profile, user.id)
    if not profile:
        raise HTTPException(404, "Create your profile first")
    return profile.data


@router.get("/assessments/current", tags=["assessments"])
def current_assessment(user: User = Depends(current_user)):
    return assessment.public_definition(assessment.definition())


def owned_attempt(id, user, db, lock=False):
    query = select(Attempt).where(Attempt.id == id, Attempt.user_id == user.id)
    if lock:
        query = query.with_for_update()
    attempt = db.scalar(query)
    if not attempt:
        raise HTTPException(404, "Assessment attempt not found")
    return attempt


def attempt_view(attempt):
    output = {
        "id": attempt.id,
        "status": attempt.status,
        "assessment_version": attempt.assessment_version,
        "answers": attempt.answers,
        "profile_snapshot": attempt.profile_snapshot,
        "created_at": attempt.created_at,
        "completed_at": attempt.completed_at,
        "assessment": assessment.public_definition(attempt.definition),
    }
    if attempt.status == "completed":
        output["summary"] = assessment.summarize(attempt.definition, attempt.answers)
    return output


@router.post("/assessments/attempts", status_code=201, tags=["assessments"])
def create_attempt(user: User = Depends(current_user), db: Session = Depends(get_db)):
    profile = db.get(Profile, user.id)
    if not profile:
        raise HTTPException(409, "Create your profile before starting an assessment")
    attempt = Attempt(
        user_id=user.id,
        assessment_version=assessment.VERSION,
        definition=assessment.definition(),
        profile_snapshot=profile.data,
    )
    db.add(attempt)
    db.commit()
    return attempt_view(attempt)


@router.get("/assessments/attempts", tags=["assessments"])
def list_attempts(
    offset: int = 0, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    if offset < 0:
        raise HTTPException(422, "Offset must be nonnegative")
    attempts = db.scalars(
        select(Attempt)
        .where(Attempt.user_id == user.id)
        .order_by(Attempt.created_at.desc())
        .offset(offset)
        .limit(50)
    )
    return [
        {
            "id": a.id,
            "status": a.status,
            "created_at": a.created_at,
            "assessment_version": a.assessment_version,
        }
        for a in attempts
    ]


@router.get("/assessments/attempts/{attempt_id}", tags=["assessments"])
def get_attempt(attempt_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return attempt_view(owned_attempt(attempt_id, user, db))


@router.put("/assessments/attempts/{attempt_id}/answers", tags=["assessments"])
def save_answers(
    attempt_id: str,
    body: AnswerBatch,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    attempt = owned_attempt(attempt_id, user, db, lock=True)
    if attempt.status != "in_progress":
        raise HTTPException(409, "Completed assessments are immutable")
    attempt.answers = assessment.merge_answers(attempt.definition, attempt.answers, body.answers)
    db.commit()
    return attempt_view(attempt)


@router.post("/assessments/attempts/{attempt_id}/complete", tags=["assessments"])
def complete(attempt_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    attempt = owned_attempt(attempt_id, user, db, lock=True)
    if attempt.status == "in_progress":
        assessment.require_complete(attempt.definition, attempt.answers)
        attempt.status = "completed"
        attempt.completed_at = datetime.now(UTC)
        db.commit()
    return attempt_view(attempt)


@router.post("/career-results/{attempt_id}", tags=["results"])
def predict(attempt_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    attempt = owned_attempt(attempt_id, user, db, lock=True)
    if attempt.status != "completed":
        raise HTTPException(409, "Complete the assessment first")
    existing = db.scalar(select(Prediction).where(Prediction.attempt_id == attempt.id))
    if existing:
        return existing.result
    try:
        predictor = get_predictor()
        result = predictor.predict(attempt.profile_snapshot, attempt.answers)
    except ModelUnavailable as exc:
        raise HTTPException(503, {"code": "model_unavailable", "message": str(exc)}) from None
    result["assessment_version"] = attempt.assessment_version
    result["assessment_summary"] = assessment.summarize(attempt.definition, attempt.answers)
    db.add(Prediction(attempt_id=attempt.id, model_version=predictor.version, result=result))
    db.commit()
    return result


@router.get("/career-results/{attempt_id}", tags=["results"])
def get_result(attempt_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned_attempt(attempt_id, user, db)
    prediction = db.scalar(select(Prediction).where(Prediction.attempt_id == attempt_id))
    if not prediction:
        raise HTTPException(404, "No prediction exists; request one after a model is available")
    return prediction.result


@router.get("/skills", tags=["catalog"])
def list_skills(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [s.data for s in db.scalars(select(Skill).order_by(Skill.id))]


@router.get("/job-roles", tags=["catalog"])
def list_roles(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [r.data for r in db.scalars(select(JobRole).order_by(JobRole.id))]
