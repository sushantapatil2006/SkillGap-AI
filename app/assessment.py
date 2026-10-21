"""Authored assessment content, not training data or database seeds.

Behaviorally anchored proficiency and work-sample scenarios follow common assessment
design practice. This instrument has not been psychometrically validated or certified.
"""

from copy import deepcopy

from fastapi import HTTPException

VERSION = "2026-10-v1"


def choice(id, section, prompt, options, rationale, **extra):
    return {
        "id": id,
        "section": section,
        "type": "single",
        "prompt": prompt,
        "options": [{"value": key, "label": label} for key, label in options],
        "required": True,
        "rationale": rationale,
        **extra,
    }


def text(id, section, prompt, rationale, required=True):
    return {
        "id": id,
        "section": section,
        "type": "text",
        "prompt": prompt,
        "max_length": 3000,
        "required": required,
        "rationale": rationale,
    }


QUESTIONS = [
    choice(
        "education",
        "background",
        "What is your current highest qualification?",
        [
            ("secondary", "Secondary school"),
            ("diploma", "Diploma or vocational qualification"),
            ("undergraduate", "Undergraduate degree in progress"),
            ("bachelors", "Bachelor's degree"),
            ("postgraduate", "Postgraduate degree in progress or completed"),
            ("other", "Another pathway"),
        ],
        "Context only; education is not treated as proof of skill.",
    ),
    choice(
        "experience",
        "background",
        "Which best describes your practical experience?",
        [
            ("learning", "Coursework or guided exercises"),
            ("projects", "Independent or team projects"),
            ("internship", "Internship or supervised workplace experience"),
            ("professional", "Professional responsibility for delivered work"),
        ],
        "Distinguishes learning exposure from applied experience.",
    ),
    text(
        "project_evidence",
        "evidence",
        "Describe one project: the problem, your own contribution, tools, validation and outcome. If you have none, describe a relevant exercise.",
        "Collects concrete evidence; free text is not automatically graded for correctness.",
    ),
    choice(
        "track",
        "interests",
        "Which area would you like to explore in this assessment?",
        [
            ("data", "Data and machine learning"),
            ("software", "Software development"),
            ("cloud", "Cloud and IT operations"),
            ("exploring", "I am still exploring"),
        ],
        "Selects relevant scenario questions; it is not a target label for role prediction.",
    ),
    text(
        "preferred_roles",
        "goals",
        "Which roles interest you, and why? Leave blank if undecided.",
        "Preferences are recorded separately from evidence used for role classification.",
        False,
    ),
    choice(
        "autonomy",
        "proficiency",
        "When using your strongest technical skill, what can you consistently do?",
        [
            ("0", "I have not used it yet"),
            ("1", "Explain fundamentals or follow a walkthrough"),
            ("2", "Complete a routine task with occasional help"),
            ("3", "Deliver and debug work independently"),
            ("4", "Design solutions, explain tradeoffs and review others' work"),
        ],
        "Provides behavioral anchors for self-reported proficiency; does not certify every listed skill.",
    ),
    text(
        "skill_evidence",
        "evidence",
        "For your strongest skills, describe when you last used each and what you completed independently.",
        "Provides context for the structured skill levels in your profile.",
    ),
    choice(
        "activity",
        "interests",
        "Which activity would you most enjoy doing regularly?",
        [
            ("analysis", "Investigating data and explaining patterns"),
            ("building", "Building and improving software"),
            ("operations", "Keeping systems reliable and secure"),
            ("discovery", "Understanding user needs and coordinating solutions"),
        ],
        "Captures work preference separately from competence.",
    ),
    choice(
        "ambiguity",
        "work_preferences",
        "When a task is underspecified, what support do you prefer?",
        [
            ("structure", "Clear examples and acceptance criteria before starting"),
            ("discussion", "An initial discussion, then room to investigate"),
            ("exploration", "Freedom to define the problem and test assumptions"),
        ],
        "Describes preferred work conditions; there is no best answer.",
    ),
    choice(
        "debugging",
        "scenario",
        "A process that worked yesterday now fails. What is the most useful first approach?",
        [
            ("rebuild", "Replace the whole process immediately"),
            ("isolate", "Reproduce the failure, inspect evidence and isolate recent changes"),
            ("retry", "Repeat it until it works without recording results"),
            ("guess", "Change several settings at once"),
        ],
        "Samples systematic troubleshooting.",
        correct="isolate",
        competency="troubleshooting",
        explanation="Reproduction and controlled changes help identify a cause without losing evidence.",
    ),
    choice(
        "communication",
        "scenario",
        "A stakeholder requests a metric that could be interpreted in two ways. What should you do first?",
        [
            ("assume", "Choose the interpretation that is quickest"),
            ("clarify", "Clarify the decision, definition and acceptance criteria with an example"),
            ("both", "Deliver both versions without explaining the difference"),
            ("ignore", "Use the definition from an unrelated project"),
        ],
        "Samples requirements clarification.",
        correct="clarify",
        competency="requirements_communication",
        explanation="An agreed definition links the output to the stakeholder's actual decision.",
    ),
    choice(
        "privacy",
        "scenario",
        "You need realistic data to debug an issue involving customer records. What is the best starting point?",
        [
            ("copy", "Copy all production records to your personal laptop"),
            ("share", "Upload records to a public forum for help"),
            ("minimize", "Use approved access and the minimum necessary de-identified data"),
            ("disable", "Disable access controls temporarily"),
        ],
        "Samples responsible data handling.",
        correct="minimize",
        competency="data_handling",
        explanation="Approved access and data minimization reduce exposure while enabling investigation.",
    ),
    choice(
        "feedback",
        "scenario",
        "A teammate identifies a flaw in your approach just before delivery. What is the best response?",
        [
            ("dismiss", "Dismiss it because implementation is complete"),
            (
                "evaluate",
                "Reproduce the issue together, assess impact and agree on a documented next step",
            ),
            ("hide", "Remove evidence of the flaw"),
            ("restart", "Restart everything without assessing the issue"),
        ],
        "Samples collaboration and evidence-based prioritization.",
        correct="evaluate",
        competency="collaboration",
        explanation="Checking impact jointly allows a proportionate response and clear ownership.",
    ),
    choice(
        "time_budget",
        "goals",
        "How much time can you realistically spend learning each week?",
        [
            ("1_3", "1–3 hours"),
            ("4_7", "4–7 hours"),
            ("8_14", "8–14 hours"),
            ("15_plus", "15+ hours"),
        ],
        "Shapes learning-plan pacing; does not affect competence scores.",
    ),
    choice(
        "timeline",
        "goals",
        "When would you like to pursue your next role or internship?",
        [
            ("now", "Within 3 months"),
            ("six_months", "Within 3–6 months"),
            ("year", "Within 6–12 months"),
            ("exploring", "Exploring without a deadline"),
        ],
        "Records the planning horizon without promising job readiness.",
    ),
    text(
        "constraints",
        "goals",
        "Are there learning-resource, schedule or accessibility preferences you want the plan to accommodate? Do not include sensitive personal information.",
        "Optional context for planning; excluded from role classification.",
        False,
    ),
]

SCENARIOS = [
    (
        "data_split",
        "data",
        "A dataset contains multiple rows from each patient. How should you evaluate generalization to new patients?",
        [
            ("random", "Randomly split rows regardless of patient"),
            ("group", "Keep each patient's rows in only one split"),
            ("train", "Evaluate on the training rows"),
            ("best", "Keep the split with the highest test score"),
        ],
        "group",
        "ml_evaluation",
        "Patient-level separation avoids leakage between training and evaluation.",
    ),
    (
        "data_join",
        "data",
        "Joining orders to order-items increases row count. What should you check before summing order revenue?",
        [
            ("grain", "The table grain and whether order totals are duplicated across items"),
            ("sort", "Whether the rows are alphabetically sorted"),
            ("drop", "Drop every repeated customer"),
            ("accept", "Assume more rows always mean more revenue"),
        ],
        "grain",
        "data_analysis",
        "A one-to-many join can duplicate order-level values; aggregate at the correct grain.",
    ),
    (
        "software_retry",
        "software",
        "A client retries a payment request after a timeout. How can the API prevent duplicate charges?",
        [
            ("delay", "Add an arbitrary delay"),
            ("key", "Use an idempotency key with atomic server-side handling"),
            ("frontend", "Disable the button only in the browser"),
            ("ignore", "Ignore all requests after the first minute"),
        ],
        "key",
        "api_design",
        "An idempotency key lets repeated requests resolve to one logical operation.",
    ),
    (
        "software_auth",
        "software",
        "An authenticated user changes an invoice ID in a URL. Which check is essential?",
        [
            ("login", "Only check that they are logged in"),
            ("owner", "Verify that the user is authorized to access that specific invoice"),
            ("hidden", "Hide invoice IDs in the UI"),
            ("length", "Check only the ID length"),
        ],
        "owner",
        "authorization",
        "Authentication identifies a user; object-level authorization controls access to a record.",
    ),
    (
        "cloud_incident",
        "cloud",
        "Latency rises immediately after a deployment. What is the best initial response?",
        [
            ("delete", "Delete monitoring data to reduce load"),
            (
                "correlate",
                "Compare telemetry with the deployment and follow the incident/rollback procedure",
            ),
            ("scale", "Scale every resource without checking the bottleneck"),
            ("wait", "Wait indefinitely because deployments are usually safe"),
        ],
        "correlate",
        "observability",
        "Telemetry and a defined incident procedure support safe diagnosis and recovery.",
    ),
    (
        "cloud_access",
        "cloud",
        "A service only needs to read one storage bucket. What permission should it receive?",
        [
            ("admin", "Administrator access to the whole account"),
            ("shared", "A shared employee password"),
            ("scoped", "A service identity with read access scoped to that bucket"),
            ("public", "Make all storage public"),
        ],
        "scoped",
        "access_control",
        "A scoped service identity follows least privilege and supports auditability.",
    ),
]

for id, track, prompt, options, correct, competency, explanation in SCENARIOS:
    QUESTIONS.append(
        choice(
            id,
            "scenario",
            prompt,
            options,
            f"Samples {competency.replace('_', ' ')} reasoning.",
            correct=correct,
            competency=competency,
            explanation=explanation,
            when={"question_id": "track", "values": [track, "exploring"]},
        )
    )


def definition():
    return {
        "version": VERSION,
        "title": "Career evidence and skills assessment",
        "estimated_minutes": "15–25",
        "instructions": "Answer from your own experience. Select a track for relevant scenarios. Update your profile skills before starting; the profile is snapshotted at the start.",
        "limitations": "This original assessment is not an industry-certified or psychometrically validated test. Scenario scores are limited evidence, not mastery estimates.",
        "questions": deepcopy(QUESTIONS),
    }


def public_definition(value):
    result = deepcopy(value)
    for question in result["questions"]:
        for key in ("correct", "explanation"):
            question.pop(key, None)
    return result


def active(question, answers):
    condition = question.get("when")
    return not condition or answers.get(condition["question_id"]) in condition["values"]


def merge_answers(definition, existing, incoming):
    questions = {q["id"]: q for q in definition["questions"]}
    result = dict(existing)
    seen = set()
    for answer in incoming:
        q = questions.get(answer.question_id)
        if not q or answer.question_id in seen:
            raise HTTPException(422, "Unknown or duplicated question ID")
        seen.add(answer.question_id)
        value = answer.value
        if q["type"] == "single":
            if not isinstance(value, str) or value not in {o["value"] for o in q["options"]}:
                raise HTTPException(422, f"Invalid option for {q['id']}")
        elif q["type"] == "text":
            if not isinstance(value, str) or len(value) > q["max_length"]:
                raise HTTPException(422, f"Invalid text for {q['id']}")
            value = value.strip()
            if q["required"] and not value:
                raise HTTPException(422, f"Answer required for {q['id']}")
        result[q["id"]] = value
    # Changing tracks discards answers that are no longer applicable.
    return {key: value for key, value in result.items() if active(questions[key], result)}


def require_complete(definition, answers):
    missing = [
        q["id"]
        for q in definition["questions"]
        if q["required"] and active(q, answers) and not answers.get(q["id"])
    ]
    if missing:
        raise HTTPException(
            422, {"message": "Required answers are missing", "question_ids": missing}
        )


def summarize(definition, answers):
    feedback = []
    for q in definition["questions"]:
        if "correct" in q and active(q, answers):
            feedback.append(
                {
                    "question_id": q["id"],
                    "competency": q["competency"],
                    "correct": answers.get(q["id"]) == q["correct"],
                    "explanation": q["explanation"],
                }
            )
    return {
        "scenario_correct": sum(item["correct"] for item in feedback),
        "scenario_total": len(feedback),
        "feedback": feedback,
        "interpretation": "Performance on these scenarios only; self-reported skill levels are not upgraded by this score.",
    }
