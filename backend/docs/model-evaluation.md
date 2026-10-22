# Uploaded dataset baseline evaluation

Run: 22 October 2026. Selected artifact: `artifacts/big-data-v2.joblib`; model version `baseline-20261022T040303Z-6234f0b7`. Its matching manifest contains full metrics, confusion matrix, split record IDs, company groups, provenance and SHA-256 checksum. Artifacts and input datasets are local and ignored by Git.

## Outcome

The training and inference pipeline works, but the model does not demonstrate useful role discrimination. It is enabled as a course demonstration at the user's request, with evaluation metadata and explicit limitations returned by the API. Successful API tests establish software behavior, not prediction accuracy.

| Held-out metric | TF-IDF + logistic regression | Training-prior baseline |
|---|---:|---:|
| Top-one accuracy | 6.54% | 19.64% |
| Macro F1 | 0.0651 | 0.0253 |
| Top-three accuracy | 22.44% | 40.47% |
| Evaluation records | 4,497 | 4,497 |

The baseline always selects the training set's most common role for its top-one result and ranks roles by training frequency for top three. The classifier distributes predictions across classes and therefore has higher macro F1 than that baseline, but lower accuracy. Uniform random top-one selection among 13 roles has expected accuracy of 7.69%; its expected top-three accuracy is 23.08%. These comparisons provide no evidence of useful role discrimination.

## Data and method

- Source: user-uploaded `big_data_job_listings.csv.zip`; 23,090 rows and 51 source titles. Publisher URL and license were not provided. Its pattern suggests synthetic data; this is not confirmed source provenance.
- Prepared data: 22,564 unique canonical skill sets, 13 mapped role families, 99 normalized skills, median 50 canonical skills per retained listing. Duplicate sets retain their first record, including when labels differ.
- Company groups: training 59, validation 19, test 18. There is zero company overlap between these partitions.
- Records: training 13,563; validation 4,504; test 4,497. All 13 classes occur in all partitions.
- Features: requirement skill text only. Job titles, company names, locations, salaries, employment types and benefits are excluded. Profile names, education and stated career preferences are also excluded from inference features.
- Pipeline: TF-IDF unigrams/bigrams, maximum 30,000 features; logistic regression with balanced class weights and seed 42. Regularization values 0.1, 1 and 10 were compared on validation macro F1. Selected C: 10.0. Validation accuracy: 6.53%; validation macro F1: 0.0651.
- The selected model was not retrained on validation/test records. An initial artifact and the final artifact have identical classifier metrics; the final artifact only updates role descriptions to use their skill profiles for similarity and expands provenance notes.

## Interpretation

The uploaded listings contain little useful role-specific signal for this baseline. This does not establish that a different algorithm cannot perform better, but it does mean the current classifier should not be described as accurate or industry validated. No training records or labels were fabricated to increase scores, and no accuracy claim is inferred from the number of rows.

Compatibility and gap scores are separate deterministic calculations over self-reported skill levels. The top 15 dataset-frequency/lift skills per role define provisional requirements; ten are marked required. Target levels are median experience-category proxies, not measured skill proficiency. These heuristics use the full source and have no independent skill-gap ground truth. No prerequisites or reviewed learning resources were supplied. Similarity compares profile evidence against each role's selected skill profile; it is not an independently validated recommendation metric.

No labeled student profiles were available. API smoke profiles are temporary verification inputs and are never included in training. Improving model quality later requires better role-specific evidence and an independent evaluation set; the current upload is sufficient to demonstrate the complete software workflow.

## Reproduction

Follow `README.md` from `backend/`. Preparation and training commands operate on the local uploaded archive; the training CLI refuses to overwrite existing outputs. Keep the artifact and manifest together, select it with `MODEL_PATH`, import the matching catalog, and run `python scripts/smoke.py --require-model` after startup. `/health/model` returns availability separately from the model's `evaluation.status`, and prediction responses include the same evaluation summary.
