"""Shared contracts for SALT-LINE data validation."""

from typing import Any


VALID_STATUSES = {
    "valid",
    "invalid",
    "simulated",
    "synthetic",
    "stale",
    "ambiguous",
    "unmatched",
    "unverified",
    "conflicting",
    "duplicate",
    "missing",
    "review_required",
}


def build_validation_result(
    *,
    source_type: str,
    status: str,
    eligible_for_demo: bool,
    eligible_for_operational_assessment: bool,
    provenance: dict[str, Any] | None = None,
    quality_flags: list[str] | None = None,
    reasons: list[str] | None = None,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a consistent validation result."""

    if status not in VALID_STATUSES:
        raise ValueError(f"Unsupported validation status: {status}")

    if eligible_for_operational_assessment and status != "valid":
        raise ValueError(
            "Only valid records can be operationally eligible."
        )

    return {
        "source_type": source_type,
        "status": status,
        "eligible_for_demo": eligible_for_demo,
        "eligible_for_operational_assessment": (
            eligible_for_operational_assessment
        ),
        "provenance": provenance or {},
        "quality_flags": quality_flags or [],
        "reasons": reasons or [],
        "details": details or {},
    }
