"""Convert the uploaded big-data listings into the project's dataset contract.

The source appears synthetic and has no bundled license/provenance metadata. This
adapter keeps that limitation explicit and never uses the source job title as a
model input feature.
"""

import argparse
import csv
import io
import json
import math
import re
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

TITLE_TO_ROLE = {
    "Big Data Administrator": "big_data_platform",
    "Big Data Consultant": "data_strategy",
    "Big Data Engineer": "data_engineer",
    "Big Data Infrastructure Engineer": "big_data_platform",
    "Big Data Operations Analyst": "big_data_platform",
    "Big Data Product Manager": "data_leadership",
    "Big Data Project Manager": "data_leadership",
    "Big Data Quality Assurance Analyst": "data_quality",
    "Big Data Solutions Architect": "data_architect",
    "Business Intelligence Analyst": "business_intelligence",
    "Business Intelligence Developer": "business_intelligence",
    "Business Intelligence Manager": "data_leadership",
    "Data Analyst": "data_analyst",
    "Data Analyst Manager": "data_leadership",
    "Data Analyst Supervisor": "data_leadership",
    "Data Analytics Manager": "data_leadership",
    "Data Architect": "data_architect",
    "Data Engineer": "data_engineer",
    "Data Engineering Manager": "data_leadership",
    "Data Governance Analyst": "data_governance",
    "Data Governance Consultant": "data_governance",
    "Data Governance Manager": "data_governance",
    "Data Governance Specialist": "data_governance",
    "Data Integration Specialist": "data_engineer",
    "Data Lake Specialist": "data_engineer",
    "Data Manager": "data_leadership",
    "Data Mining Specialist": "data_scientist",
    "Data Modeler": "data_architect",
    "Data Operations Manager": "data_leadership",
    "Data Privacy Officer": "data_security_privacy",
    "Data Quality Analyst": "data_quality",
    "Data Science Researcher": "data_scientist",
    "Data Scientist": "data_scientist",
    "Data Scientist Manager": "data_leadership",
    "Data Security Analyst": "data_security_privacy",
    "Data Security Manager": "data_security_privacy",
    "Data Strategist": "data_strategy",
    "Data Transformation Specialist": "data_strategy",
    "Data Visualization Specialist": "data_analyst",
    "Data Warehouse Analyst": "data_warehouse",
    "Data Warehouse Architect": "data_warehouse",
    "Data Warehouse Consultant": "data_warehouse",
    "Data Warehouse Developer": "data_warehouse",
    "Data Warehouse Manager": "data_warehouse",
    "Hadoop Administrator": "big_data_platform",
    "Hadoop Developer": "big_data_platform",
    "Machine Learning Engineer": "machine_learning",
    "Machine Learning Scientist": "machine_learning",
    "NoSQL Database Administrator": "big_data_platform",
    "Predictive Analytics Specialist": "data_scientist",
    "Senior Big Data Analyst": "data_analyst",
}

ROLE_TITLES = {
    "big_data_platform": "Big Data Platform Specialist",
    "business_intelligence": "Business Intelligence Specialist",
    "data_analyst": "Data Analyst",
    "data_architect": "Data Architect",
    "data_engineer": "Data Engineer",
    "data_governance": "Data Governance Specialist",
    "data_leadership": "Data and Analytics Manager",
    "data_quality": "Data Quality Specialist",
    "data_scientist": "Data Scientist",
    "data_security_privacy": "Data Security and Privacy Specialist",
    "data_strategy": "Data Strategy Consultant",
    "data_warehouse": "Data Warehouse Specialist",
    "machine_learning": "Machine Learning Specialist",
}

EXPERIENCE_LEVEL = {"Entry Level": 1, "Mid Level": 2, "Senior Level": 3}


def split_requirements(value: str) -> list[str]:
    """Split commas outside parentheses, preserving example lists."""
    output, start, depth = [], 0, 0
    for index, character in enumerate(value):
        if character == "(":
            depth += 1
        elif character == ")":
            depth = max(0, depth - 1)
        elif character == "," and depth == 0:
            output.append(value[start:index].strip())
            start = index + 1
    output.append(value[start:].strip())
    return [item for item in output if item]


def skill_name(value: str) -> str:
    return re.sub(r"\s*\(e\.g\.,.*\)\s*$", "", value, flags=re.IGNORECASE).strip()


def skill_aliases(value: str) -> list[str]:
    match = re.search(r"\((?!e\.g\.)\s*([A-Za-z][A-Za-z0-9+#.-]{1,14})\s*\)$", value, re.I)
    return [match.group(1)] if match else []


def slug(value: str) -> str:
    result = re.sub(r"[^a-z0-9]+", "_", value.casefold()).strip("_")
    return result[:100]


def read_source(path: Path) -> list[dict[str, str]]:
    if path.suffix.casefold() == ".zip":
        with zipfile.ZipFile(path) as archive:
            members = [name for name in archive.namelist() if name.casefold().endswith(".csv")]
            if len(members) != 1:
                raise ValueError("ZIP must contain exactly one CSV")
            with archive.open(members[0]) as raw:
                return list(csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")))
    with path.open(encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def prepare(path: Path, output: Path):
    rows = read_source(path)
    expected = {
        "Company",
        "Job Title",
        "Location",
        "Job Type",
        "Experience Level",
        "Salary",
        "Requirements",
        "Facilities",
    }
    if not rows or set(rows[0]) != expected:
        raise ValueError("Unexpected source columns")
    unknown = sorted({row["Job Title"] for row in rows} - set(TITLE_TO_ROLE))
    if unknown:
        raise ValueError(f"Unmapped titles: {unknown}")

    global_count = Counter()
    role_count = Counter()
    role_skill_count: dict[str, Counter] = defaultdict(Counter)
    role_skill_levels: dict[tuple[str, str], list[int]] = defaultdict(list)
    canonical: dict[str, dict] = {}
    jobs, seen_descriptions = [], set()

    for index, row in enumerate(rows, 1):
        role_id = TITLE_TO_ROLE[row["Job Title"]]
        names = []
        for raw_skill in split_requirements(row["Requirements"]):
            name = skill_name(raw_skill)
            skill_id = slug(name)
            if not skill_id:
                continue
            names.append(skill_id)
            record = canonical.setdefault(
                skill_id, {"id": skill_id, "name": name, "aliases": [], "prerequisites": []}
            )
            record["aliases"] = sorted(set(record["aliases"] + skill_aliases(raw_skill)))
        names = sorted(set(names))
        global_count.update(names)
        role_count[role_id] += 1
        role_skill_count[role_id].update(names)
        level = EXPERIENCE_LEVEL[row["Experience Level"]]
        for skill_id in names:
            role_skill_levels[(role_id, skill_id)].append(level)

        # Requirements are the evidence. Title, salary, location and benefits are excluded
        # because they would leak the label or add irrelevant demographic/economic proxies.
        description = "Required technical skills and qualifications for this listing: " + "; ".join(
            canonical[skill_id]["name"] for skill_id in names
        )
        normalized = " ".join(description.casefold().split())
        if normalized in seen_descriptions:
            continue
        seen_descriptions.add(normalized)
        jobs.append(
            {
                "id": f"listing_{index:05d}",
                "role_id": role_id,
                "description": description,
                "group_id": slug(row["Company"]),
                "source": "Uploaded big_data_job_listings.csv.zip; original URL and license not supplied",
                "skill_ids": names,
            }
        )

    total = len(rows)
    roles = []
    for role_id, title in ROLE_TITLES.items():
        candidates = []
        for skill_id, count in role_skill_count[role_id].items():
            role_frequency = count / role_count[role_id]
            global_frequency = global_count[skill_id] / total
            # Prefer skills frequent within the role and unusually frequent versus all roles.
            lift = role_frequency / global_frequency
            score = role_frequency * math.log2(1 + lift)
            levels = sorted(role_skill_levels[(role_id, skill_id)])
            level = levels[len(levels) // 2]
            candidates.append((score, role_frequency, skill_id, level, lift))
        selected = sorted(candidates, reverse=True)[:15]
        requirements = []
        for rank, (score, _frequency, skill_id, level, _lift) in enumerate(selected):
            requirements.append(
                {
                    "skill_id": skill_id,
                    "level": level,
                    "weight": round(1 + 9 * score / selected[0][0], 3),
                    "required": rank < 5,
                }
            )
        roles.append(
            {
                "id": role_id,
                "title": title,
                "description": "Dataset-derived skill profile: "
                + "; ".join(
                    canonical[requirement["skill_id"]]["name"] for requirement in requirements
                ),
                "requirements": requirements,
            }
        )

    bundle = {
        "schema_version": "1.0",
        "version": "uploaded-big-data-listings-2023-12-v1",
        "provenance": (
            "Converted from the user-provided big_data_job_listings.csv.zip, whose archive timestamp is "
            "2023-12-01. The original publisher URL and license were not supplied. The data appears synthetic; "
            "company names and unusually long requirement lists limit external validity. "
            "Skill levels are heuristic proxies from median listed experience, not assessed proficiency. "
            "Required flags and weights are frequency-derived heuristics; prerequisites are unknown."
        ),
        "skills": sorted(canonical.values(), key=lambda item: item["id"]),
        "roles": roles,
        "jobs": jobs,
        "student_profiles": [],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(bundle, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "output": str(output),
                "source_rows": len(rows),
                "deduplicated_jobs": len(jobs),
                "roles": len(roles),
                "skills": len(canonical),
                "warning": "Source provenance/license unknown; data appears synthetic.",
            },
            indent=2,
        )
    )


def main():
    parser = argparse.ArgumentParser(description="Prepare the uploaded big-data listings")
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    arguments = parser.parse_args()
    prepare(arguments.source, arguments.output)


if __name__ == "__main__":
    main()
