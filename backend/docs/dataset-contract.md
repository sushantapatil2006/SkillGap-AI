# Dataset handoff contract

Export UTF-8 JSON matching `uv run skillgap-data schema`. Do not send credentials, names or other unnecessary personal data in job text. Keep private student data out of Git. A real taxonomy and role requirements are prerequisites for usable recommendations; a CSV of job titles and descriptions alone is not enough.

## Bundle fields

| Field | Required content |
|---|---|
| `schema_version` | Exactly `1.0` |
| `version` | A dataset release identifier |
| `provenance` | Sources, collection dates, permission/license information, deduplication and labeling method; at least 20 characters |
| `skills` | Nonempty canonical skill taxonomy |
| `roles` | At least two distinct role categories with requirements |
| `jobs` | Job descriptions and role labels |
| `student_profiles` | Optional separately labeled student profiles for out-of-domain evaluation |

Identifiers for skills and roles match `[a-z0-9][a-z0-9_-]{0,99}`. Unknown fields, broken references, duplicate IDs, ambiguous aliases, normalized duplicate descriptions and prerequisite cycles are rejected. JSON must contain finite numeric weights. Full field bounds are in the generated schema.

## Skills

Each record contains `id`, `name`, optional `aliases` and optional `prerequisites` (other skill IDs). A canonical name or alias must identify only one skill. Map equivalent spellings to the same skill; keep distinct technologies separate. Prerequisites must form an acyclic graph. Required skill evidence extracted from job descriptions should use this taxonomy.

## Roles and requirements

Each role contains `id`, `title`, `description` (at least 20 characters), and a nonempty `requirements` array. Each requirement has `skill_id`, integer `level` from 1–4, numeric `weight` greater than 0 and at most 10, and `required` (defaults to true). Include at least one required skill per role; no duplicate skill requirements.

Proficiency anchors: 1 = guided basics, 2 = routine work with occasional help, 3 = independent delivery/debugging, 4 = design and review expertise. Record how analysts inferred levels and weights in provenance. Frequency of mentions alone does not establish proficiency or importance. Optional requirements produce recommendations but do not reduce the required-skill compatibility score.

## Job descriptions

Each record has `id`, `role_id`, `description` (at least 40 characters), `group_id`, `source`, and optionally `skill_ids` for extracted canonical skill labels. Referenced roles and skills must exist.

`group_id` defines leakage boundaries. Use company/source/template families, and put near-duplicate postings in the same group. Deduplicate exact descriptions. The training command partitions groups, not individual rows, into approximately 60% training, 20% validation and 20% test using stratified group folds. All roles need at least five independent groups and must occur in every partition. Collect substantially more observations than this structural minimum. Do not invent group IDs to force a split to pass.

## Student profiles

Each record contains a pseudonymous `id`, a `profile` matching the API's `ProfileInput` schema, a `role_id` label, and `label_source` documenting how that label was independently established. The current API profile schema includes `display_name`; use a pseudonym in exports. Only skill names/evidence, project summaries and experience summaries feed the classifier. Desired roles, education, names and constraints are excluded.

These records are reserved for evaluation in the initial pipeline. A student's desired role is not ground truth for suitability. Use an independently justified label and document limitations; if valid labels are unavailable, omit these records and report student applicability as unvalidated. Profile text should not be copied from job descriptions in the training set.

## Outputs and review

`train` tries logistic regression regularization values 0.1, 1 and 10 against the validation partition. It persists the selected pipeline without retraining on evaluation records. The manifest contains dataset version/provenance, split record IDs, model version, scikit-learn version, validation/test accuracy, macro F1, per-class metrics, confusion matrix and top-three accuracy. Top-three accuracy is trivially 100% when there are no more than three roles and should not be used as the main metric in that case.

If supplied, student profiles get a separate evaluation report. No automatic acceptance threshold is assumed. Review per-role error rates, class support, dataset bias and student applicability before enabling results. A model release consists of the `.joblib` and matching `.json` manifest. Import its matching taxonomy into the API catalog and select the model via `MODEL_PATH`.

## Initial course dataset

`training.prepare_big_data` converts the locally supplied `big_data_job_listings.csv.zip`. It maps 51 overlapping source titles into 13 role families, parses commas outside parentheses, removes duplicate skill sets, groups by company, and derives 15 requirements per role from within-role frequency and lift. Median listed experience determines the provisional level; the ten highest-ranked requirements are marked required. These are reproducible heuristics rather than verified industry standards.

The source contains 23,090 rows, 96 company names and a fixed vocabulary of 100 requirement phrases, normalized to 99 skills. Its source URL and license were not supplied. Company naming patterns, balanced title counts and a median of 50 canonical skills per retained listing suggest synthetic generation. The earlier estimate of 63 came from splitting all commas, including those inside parenthetical examples; the adapter correctly preserves those examples. Keep this disclosure with any metrics or demonstration built from it.

Preparation retains the first occurrence of each canonical skill set globally (22,564 listings remain). The requirement heuristics are derived from the full source, so their compatibility scores are not a held-out evaluation. Classification uses only listing skill text and reports separate company-grouped test metrics; no student-profile or skill-gap ground truth was available. See [model evaluation](model-evaluation.md).
