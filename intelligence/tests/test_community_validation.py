from datetime import datetime, timezone

import pytest

from intelligence.validation.community_validation import (
    validate_community_reports,
)


NOW = datetime(2026, 11, 20, 12, 0, tzinfo=timezone.utc)


def report(**overrides):
    data = {
        "id": 1,
        "reporter_id": "resident_01",
        "location_id": "udupi_loc_01",
        "latitude": 13.35,
        "longitude": 74.70,
        "observation": "Water tastes salty",
        "reported_at": "2026-11-20T11:00:00+00:00",
        "verification_status": "unverified",
    }
    data.update(overrides)
    return data


def validate(reports):
    return validate_community_reports(
        reports,
        {"udupi_loc_01", "udupi_loc_02"},
        now=NOW,
    )


def test_unverified_report_is_demo_eligible():
    result = validate([report()])
    item = result["reports"][0]

    assert item["eligible_for_demo"] is True
    assert item["eligible_for_operational_assessment"] is False
    assert item["verification_status"] == "unverified"


def test_unknown_location_is_flagged():
    result = validate([report(location_id="unknown")])
    assert "UNKNOWN_LOCATION" in result["reports"][0]["quality_flags"]


def test_duplicate_reports_are_identified():
    result = validate([
        report(id=1),
        report(id=2),
    ])

    assert result["reports"][1]["status"] == "duplicate"
    assert result["reports"][1]["eligible_for_operational_assessment"] is False


def test_conflicting_reports_are_flagged():
    result = validate([
        report(id=1, observation="Water quality improved and is clear"),
        report(id=2, observation="Water quality became salty and worse"),
    ])

    assert all(item["conflict"] for item in result["reports"])
    assert all(
        item["eligible_for_operational_assessment"] is False
        for item in result["reports"]
    )


def test_future_report_is_rejected():
    result = validate([
        report(reported_at="2026-11-21T12:00:00+00:00")
    ])
    assert "FUTURE_TIMESTAMP" in result["reports"][0]["quality_flags"]


def test_invalid_category_is_flagged():
    result = validate([report(category="made_up")])
    assert "INVALID_CATEGORY" in result["reports"][0]["quality_flags"]


def test_invalid_observation():
    result = validate([report(observation="x")])
    assert "INVALID_OBSERVATION" in result["reports"][0]["quality_flags"]


def test_invalid_input():
    with pytest.raises(TypeError):
        validate_community_reports({}, set())
