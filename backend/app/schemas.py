from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

ShortText = Annotated[str, Field(min_length=1, max_length=200)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Credentials(StrictModel):
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=12, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value):
        return value.lower()

    # Password whitespace is meaningful; do not normalize it.
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)


class SkillClaim(StrictModel):
    name: ShortText
    level: int = Field(ge=0, le=4, strict=True)
    evidence: str = Field(default="", max_length=2000)


class ProfileInput(StrictModel):
    display_name: ShortText
    education_level: str = Field(min_length=1, max_length=100)
    specialization: str = Field(default="", max_length=200)
    experience_months: int = Field(default=0, ge=0, le=720, strict=True)
    experience_summary: str = Field(default="", max_length=5000)
    project_summary: str = Field(default="", max_length=5000)
    skills: list[SkillClaim] = Field(default_factory=list, max_length=100)
    desired_roles: list[ShortText] = Field(default_factory=list, max_length=10)

    @field_validator("skills")
    @classmethod
    def unique_skills(cls, value):
        names = [skill.name.casefold() for skill in value]
        if len(names) != len(set(names)):
            raise ValueError("Each skill may only appear once")
        return value


class AnswerInput(StrictModel):
    question_id: str = Field(min_length=1, max_length=100)
    value: str | int | list[str]


class AnswerBatch(StrictModel):
    answers: list[AnswerInput] = Field(min_length=1, max_length=50)
