from training.prepare_big_data import (
    ROLE_TITLES,
    TITLE_TO_ROLE,
    skill_aliases,
    skill_name,
    split_requirements,
)


def test_all_source_titles_map_to_known_roles():
    assert set(TITLE_TO_ROLE.values()) == set(ROLE_TITLES)
    assert len(TITLE_TO_ROLE) == 51


def test_requirement_parser_preserves_examples():
    value = "SQL, Cloud Computing (e.g., AWS, Azure, GCP), Natural Language Processing (NLP)"
    assert split_requirements(value) == [
        "SQL",
        "Cloud Computing (e.g., AWS, Azure, GCP)",
        "Natural Language Processing (NLP)",
    ]
    assert skill_name(split_requirements(value)[1]) == "Cloud Computing"
    assert skill_aliases(split_requirements(value)[2]) == ["NLP"]
    assert skill_aliases(split_requirements(value)[1]) == []
