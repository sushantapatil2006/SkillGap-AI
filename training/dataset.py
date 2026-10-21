import json
from pathlib import Path
from typing import Annotated

from pydantic import Field, model_validator

from app.schemas import ProfileInput, ShortText, StrictModel

ID = Annotated[str, Field(pattern=r"^[a-z0-9][a-z0-9_-]{0,99}$")]


class SkillRecord(StrictModel):
    id: ID
    name: ShortText
    aliases: list[ShortText] = Field(default_factory=list, max_length=100)
    prerequisites: list[ID] = Field(default_factory=list, max_length=30)


class Requirement(StrictModel):
    skill_id: ID
    level: int = Field(ge=1, le=4, strict=True)
    weight: float = Field(gt=0, le=10, allow_inf_nan=False)
    required: bool = True


class RoleRecord(StrictModel):
    id: ID
    title: ShortText
    description: str = Field(min_length=20, max_length=20000)
    requirements: list[Requirement] = Field(min_length=1, max_length=200)


class JobRecord(StrictModel):
    id: ShortText
    role_id: ID
    description: str = Field(min_length=40, max_length=50000)
    group_id: ShortText
    source: str = Field(min_length=1, max_length=2000)
    skill_ids: list[ID] = Field(default_factory=list, max_length=200)


class StudentRecord(StrictModel):
    id: ShortText
    profile: ProfileInput
    role_id: ID
    label_source: str = Field(min_length=1, max_length=2000)


class Dataset(StrictModel):
    schema_version: str = Field(pattern=r"^1\.0$")
    version: ShortText
    provenance: str = Field(min_length=20, max_length=10000)
    skills: list[SkillRecord] = Field(min_length=1)
    roles: list[RoleRecord] = Field(min_length=2)
    jobs: list[JobRecord] = Field(min_length=1)
    student_profiles: list[StudentRecord] = Field(default_factory=list)

    @model_validator(mode="after")
    def relationships(self):
        for name in ("skills", "roles", "jobs", "student_profiles"):
            ids = [item.id for item in getattr(self, name)]
            if len(ids) != len(set(ids)):
                raise ValueError(f"Duplicate IDs in {name}")
        skills = {s.id: s for s in self.skills}
        roles = {r.id for r in self.roles}
        aliases = {}
        for skill in self.skills:
            for alias in [skill.name, *skill.aliases]:
                key = alias.casefold().strip()
                if key in aliases and aliases[key] != skill.id:
                    raise ValueError(f"Ambiguous skill name or alias: {alias}")
                aliases[key] = skill.id
            if any(p not in skills or p == skill.id for p in skill.prerequisites):
                raise ValueError(f"Invalid prerequisite for {skill.id}")
        visiting, visited = set(), set()

        def visit(id):
            if id in visiting:
                raise ValueError("Skill prerequisite cycle")
            if id in visited:
                return
            visiting.add(id)
            for p in skills[id].prerequisites:
                visit(p)
            visiting.remove(id)
            visited.add(id)

        for id in skills:
            visit(id)
        for role in self.roles:
            ids = [r.skill_id for r in role.requirements]
            if len(ids) != len(set(ids)) or any(id not in skills for id in ids):
                raise ValueError(f"Invalid or duplicate skill requirements for {role.id}")
            if not any(r.required for r in role.requirements):
                raise ValueError(f"At least one required skill needed for {role.id}")
        if any(j.role_id not in roles for j in self.jobs) or any(
            s.role_id not in roles for s in self.student_profiles
        ):
            raise ValueError("Unknown role reference")
        texts = [" ".join(j.description.casefold().split()) for j in self.jobs]
        if any(skill_id not in skills for job in self.jobs for skill_id in job.skill_ids):
            raise ValueError("Unknown extracted skill reference in jobs")
        if len(texts) != len(set(texts)):
            raise ValueError("Duplicate normalized job descriptions; deduplicate before training")
        return self


def read_dataset(path: Path) -> Dataset:
    return Dataset.model_validate(json.loads(path.read_text(encoding="utf-8")))
