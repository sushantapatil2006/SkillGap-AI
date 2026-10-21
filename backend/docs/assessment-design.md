# Assessment design and interpretation

The initial instrument is original authored content, version `2026-10-v1`. It follows common practices of behaviorally anchored self-reporting, evidence prompts and situational/work-sample questions. It is **not an accredited industry assessment, a validated psychometric instrument, or a guarantee of career suitability**.

## Flow

Profile setup captures education, specialization, experience, projects, named skills with levels and optional desired roles. Starting an attempt freezes this profile and a complete copy of the assessment definition. A learner who changes their profile must start a new attempt for those changes to affect results.

The instrument contains 16 shared questions (two optional) and six conditional technical scenarios. Choosing data, software or cloud activates two technical scenarios; exploring activates all six. Thus a selected track shows 18 questions and exploration shows 22. The anticipated duration is 15–25 minutes and needs confirmation through a pilot study.

Sections cover qualifications, practical experience, project evidence, technical autonomy, career preferences, work conditions, troubleshooting, requirements communication, privacy, collaboration and learning constraints. Each question has a rationale. Scenario answer keys and explanations stay on the server until completion; public question responses omit them. Conditional questions include frontend-readable `when` rules, also enforced by the server. Track changes discard inapplicable answers.

There is no external LLM call generating fresh questions at request time. Questions are consistent and reviewable across users. To revise content, edit `app/assessment.py`, update `VERSION`, add targeted validation tests and review the rationale and scoring. Historical attempts retain their own definitions and keys. No quiz content is inserted into database tables at startup.

## Scoring and ML features

- Background, interests, autonomy and goals have no right/wrong score.
- Scenario answers yield correct/total counts and individual explanations. Do not compare totals across tracks as if their difficulty were calibrated.
- Free text is evidence input, not automatically graded proof of skill. No arbitrary score is assigned based on writing length or style.
- Role classification uses profile skills/evidence, project/experience summaries and the two assessment evidence prompts. Selected track, desired roles, names, qualifications and constraints do not directly enter the classifier.
- Work preferences, time budget and target roles are recorded for context. The baseline does not infer mastery from them or assign course-duration estimates.
- Compatibility is `100 × sum(weight × min(reported_level / required_level, 1)) / sum(weight)` over required role skills. Skills absent from a profile are explicitly marked unassessed. Merely mentioning a skill in text does not certify proficiency.
- Gap priority uses relative proficiency shortfall multiplied by dataset weight, with required gaps before optional gaps. Prerequisites determine the final learning order. Resource links and estimated durations await a reviewed resource catalog.

The scenario competencies are reported alongside recommendations as separate evidence. They do not silently override skill levels because a few multiple-choice responses cannot establish broad mastery. The system currently provides a focused baseline for data/software/cloud careers, not a complete occupational assessment.

## Validation before stronger claims

Have subject-matter reviewers check technical accuracy, answer ambiguity and relevance to target roles. Pilot with students, measure completion time and question difficulty, investigate distractors, compare scores with independent project/skill evaluations, and check accessibility and subgroup behavior. Expand technical question coverage before using scenario scores as proficiency estimates. Validate role predictions on independently labeled student profiles and report uncertainty and dataset limitations. Item keys are visible to repository contributors; this is a formative guidance tool, not a secure proctored examination.
