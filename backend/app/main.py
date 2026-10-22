import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings
from app.db import get_engine
from app.ml import ModelUnavailable, get_predictor
from app.routes import router

logger = logging.getLogger("skillgap")


@asynccontextmanager
async def lifespan(app):
    get_settings()
    logging.basicConfig(level=logging.INFO)
    logger.info("SkillGap API starting")
    yield
    get_engine().dispose()


def create_app():
    settings = get_settings()
    application = FastAPI(title="SkillGap AI API", version="0.1.0", lifespan=lifespan)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )
    application.include_router(router)

    @application.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        # Pydantic's default errors include raw inputs, possibly passwords or profile text.
        return JSONResponse(
            status_code=422,
            content={
                "detail": [
                    {key: error[key] for key in ("loc", "msg", "type")} for error in exc.errors()
                ]
            },
        )

    @application.get("/health/live", tags=["health"])
    def live():
        return {"status": "ok"}

    @application.get("/health/ready", tags=["health"])
    def ready():
        try:
            with get_engine().connect() as connection:
                connection.execute(text("SELECT version_num FROM alembic_version"))
                connection.execute(text("SELECT id FROM users LIMIT 1"))
        except SQLAlchemyError:
            raise HTTPException(503, "Database unavailable or migrations not applied") from None
        return {"status": "ready"}

    @application.get("/health/model", tags=["health"])
    def model_status():
        try:
            predictor = get_predictor()
            return {
                "status": "available",
                "version": predictor.version,
                "evaluation": predictor.evaluation_summary(),
            }
        except ModelUnavailable:
            raise HTTPException(503, {"code": "model_unavailable"}) from None

    return application


app = create_app()
