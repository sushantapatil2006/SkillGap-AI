"""CLI and standalone utility for predicting career roles, compatibility, skill gaps, and learning roadmaps.

Usage:
  python scripts/predict.py --skills "Python:3,SQL:2,Data Analysis:3" --summary "Built ETL data pipelines"
  python scripts/predict.py --profile profile.json
  python scripts/predict.py --interactive
"""

import argparse
import json
import sys
from pathlib import Path

# Add backend directory to path if running directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings
from app.ml import ModelUnavailable, get_predictor, load_predictor


def parse_skill_pairs(skills_str: str) -> list[dict]:
    skills = []
    for item in skills_str.split(","):
        item = item.strip()
        if not item:
            continue
        if ":" in item:
            name, level_str = item.split(":", 1)
            try:
                level = int(level_str.strip())
            except ValueError:
                level = 1
        else:
            name = item
            level = 1
        skills.append({"name": name.strip(), "level": max(0, min(4, level))})
    return skills


def format_prediction_output(result: dict) -> str:
    lines = []
    lines.append("=" * 70)
    lines.append(f"  SKILLGAP AI CAREER PREDICTION REPORT")
    lines.append(f"  Model Version: {result.get('model_version')}")
    lines.append(f"  Status: {result.get('evaluation', {}).get('status', 'unknown')}")
    lines.append("=" * 70)

    roles = result.get("roles") or result.get("recommendations") or []
    for role in roles:
        rank = role.get("rank", 1)
        title = role.get("role_title") or role.get("title", "Unknown Role")
        compat = role.get("compatibility") or role.get("compatibility_score", 0.0)
        score = role.get("model_score", 0.0)
        sim = role.get("text_similarity", 0.0)

        lines.append(f"\n[RANK #{rank}] {title}")
        lines.append(f"  - Skill Requirements Compatibility: {compat}%")
        lines.append(f"  - Classifier Signal Score:           {score}")
        lines.append(f"  - Vocabulary Text Similarity:        {sim}")

        strengths = role.get("strengths") or []
        if strengths:
            lines.append(f"  - Verified Strengths ({len(strengths)}):")
            for s in strengths[:5]:
                lines.append(f"      * {s.get('name')} (self-reported)")
        else:
            lines.append("  - Verified Strengths: None met requirement target level yet")

        gaps = role.get("skill_gaps") or role.get("gaps") or []
        if gaps:
            lines.append(f"  - Priority Skill Gaps ({len(gaps)}):")
            for g in gaps[:5]:
                req_tag = "REQUIRED" if g.get("required") else "OPTIONAL"
                lines.append(
                    f"      * [{req_tag}] {g.get('name')} "
                    f"(Current: Lvl {g.get('reported_level', 0)} -> Target: Lvl {g.get('required_level', 1)})"
                )

        roadmap = role.get("learning_plan") or role.get("recommendations") or []
        if roadmap:
            lines.append(f"  - Sequenced Learning Curriculum ({len(roadmap)} milestones):")
            for idx, step in enumerate(roadmap[:5], 1):
                lines.append(
                    f"      {idx}. {step.get('name')} (Target: Lvl {step.get('target_level', 1)}) "
                    f"- {step.get('reason')}"
                )

    unrecognized = result.get("unrecognized_skills", [])
    if unrecognized:
        lines.append("\nUnrecognized Skills (not present in current training catalog):")
        lines.append("  " + ", ".join(unrecognized))

    lines.append("\n" + "-" * 70)
    lines.append("Limitations & Intended Use:")
    for note in result.get("limitations", []):
        lines.append(f"  - {note}")
    lines.append("=" * 70)
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="SkillGap AI Career Prediction Module")
    parser.add_argument("--model", type=Path, help="Path to trained .joblib model artifact")
    parser.add_argument("--profile", type=Path, help="Path to profile JSON file")
    parser.add_argument("--skills", type=str, help="Comma-separated skill:level pairs (e.g. 'Python:3,SQL:2')")
    parser.add_argument("--summary", type=str, default="", help="Candidate project and experience summary text")
    parser.add_argument("--track", type=str, default="data", choices=["data", "software", "cloud"], help="Assessment track")
    parser.add_argument("--json", action="store_true", dest="as_json", help="Output raw JSON response")
    parser.add_argument("--interactive", action="store_true", help="Interactively enter skills and experience")

    args = parser.parse_args()

    # Load predictor
    try:
        if args.model:
            model_path = args.model
            manifest = json.loads(model_path.with_suffix(".json").read_text(encoding="utf-8"))
            predictor = load_predictor(
                str(model_path.resolve()),
                model_path.stat().st_mtime_ns,
                model_path.with_suffix(".json").stat().st_mtime_ns,
            )
        else:
            predictor = get_predictor()
    except ModelUnavailable as exc:
        print(f"Error: {exc}", file=sys.stderr)
        print("\nTo train the model, run:\n  python -m training.cli train data/dataset.json --output artifacts/model.joblib\n", file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        print(f"Failed to load model: {exc}", file=sys.stderr)
        sys.exit(1)

    profile_data = {}
    answers = {"track": args.track, "time_budget": "10_hours"}

    if args.profile:
        if not args.profile.exists():
            print(f"Profile file not found: {args.profile}", file=sys.stderr)
            sys.exit(1)
        profile_data = json.loads(args.profile.read_text(encoding="utf-8"))
    elif args.interactive:
        print("\n=== SkillGap AI Interactive Career Predictor ===")
        summary = input("Enter project/experience summary: ").strip()
        skills_input = input("Enter skills as Name:Level pairs (e.g. Python:3, SQL:2, Spark:1): ").strip()
        profile_data = {
            "project_summary": summary,
            "experience_summary": summary,
            "skills": parse_skill_pairs(skills_input),
        }
    else:
        skills = parse_skill_pairs(args.skills) if args.skills else [
            {"name": "Python", "level": 3},
            {"name": "SQL", "level": 2},
            {"name": "Data Analysis", "level": 2},
        ]
        summary = args.summary or "Data engineering and analytical pipelines with ETL workflows."
        profile_data = {
            "project_summary": summary,
            "experience_summary": summary,
            "skills": skills,
        }

    try:
        prediction = predictor.predict(profile_data, answers)
    except ModelUnavailable as exc:
        print(f"Prediction unavailable: {exc}", file=sys.stderr)
        sys.exit(1)

    if args.as_json:
        print(json.dumps(prediction, indent=2))
    else:
        print(format_prediction_output(prediction))


if __name__ == "__main__":
    main()
