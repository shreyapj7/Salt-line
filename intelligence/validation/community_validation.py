"""SALT-LINE community report validation."""

from datetime import datetime, timezone
import re


VALID_CATEGORIES = {
    "water_quality",
    "well_condition",
    "water_availability",
    "infrastructure",
    "other",
}

POSITIVE_TERMS = {
    "improved", "normal", "clear", "recovered", "better"
}

NEGATIVE_TERMS = {
    "salty", "saline", "contaminated", "worse", "declined",
    "reduced", "unusable", "dry"
}


def _normalize(text):
    return " ".join(
        re.findall(r"[a-z0-9]+", str(text).lower())
    )


def _parse_timestamp(value):
    if not isinstance(value, str):
        return None

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))

        if parsed.tzinfo is None:
            return None

        return parsed.astimezone(timezone.utc)
    except (ValueError, TypeError):
        return None


def _category_for(report):
    category = report.get("category")

    if category is not None:
        return category if category in VALID_CATEGORIES else None

    # Existing API records have no category field.
    # Keep category optional and infer only for display/classification.
    text = report.get("observation", "").lower()

    if any(word in text for word in ("well", "borewell")):
        return "well_condition"

    if any(word in text for word in ("salty", "taste", "water quality")):
        return "water_quality"

    if any(word in text for word in ("shortage", "availability", "dry")):
        return "water_availability"

    return "other"


def validate_community_reports(
    reports,
    valid_location_ids,
    now=None,
):
    if not isinstance(reports, list):
        raise TypeError("reports must be a list")

    location_ids = set(valid_location_ids)
    reference_time = now or datetime.now(timezone.utc)

    if reference_time.tzinfo is None:
        raise ValueError("now must be timezone-aware")

    reference_time = reference_time.astimezone(timezone.utc)

    results = []

    for report in reports:
        if not isinstance(report, dict):
            raise TypeError("Each report must be a dictionary")

        flags = []
        reasons = []

        report_id = report.get("id")
        location_id = report.get("location_id")
        observation = report.get("observation")
        timestamp = _parse_timestamp(report.get("reported_at"))

        category = _category_for(report)

        if not report_id:
            flags.append("MISSING_REPORT_ID")

        if location_id not in location_ids:
            flags.append("UNKNOWN_LOCATION")
            reasons.append("Report location is not in the location registry.")

        if not isinstance(observation, str) or not 5 <= len(observation.strip()) <= 1000:
            flags.append("INVALID_OBSERVATION")

        if not timestamp:
            flags.append("INVALID_TIMESTAMP")
        elif timestamp > reference_time:
            flags.append("FUTURE_TIMESTAMP")

        verification = report.get("verification_status", "unverified")

        if verification not in {
            "unverified", "verified", "rejected", "needs_review"
        }:
            flags.append("INVALID_VERIFICATION_STATUS")

        supplied_category = report.get("category")

        if supplied_category is not None and category is None:
            flags.append("INVALID_CATEGORY")

        duplicate_key = (
            location_id,
            _normalize(observation),
        ) if isinstance(observation, str) else None

        results.append({
            "report_id": report_id,
            "location_id": location_id,
            "category": category or "other",
            "verification_status": verification,
            "status": "valid" if not flags else "review_required",
            "eligible_for_demo": (
                not any(flag in flags for flag in (
                    "MISSING_REPORT_ID",
                    "UNKNOWN_LOCATION",
                    "INVALID_OBSERVATION",
                    "INVALID_TIMESTAMP",
                    "FUTURE_TIMESTAMP",
                    "INVALID_CATEGORY",
                ))
            ),
            "eligible_for_operational_assessment": (
                not flags
                and verification == "verified"
            ),
            "quality_flags": flags,
            "reasons": reasons,
            "duplicate_key": duplicate_key,
            "conflict": False,
        })

    # Detect duplicates without deleting or merging reports.
    seen = {}

    for result in results:
        key = result["duplicate_key"]

        if key is None:
            continue

        if key in seen:
            result["quality_flags"].append("DUPLICATE_REPORT")
            result["status"] = "duplicate"
            result["eligible_for_operational_assessment"] = False
            result["duplicate_of"] = seen[key]
        else:
            seen[key] = result["report_id"]

    # Detect explicitly contradictory observations at one location.
    grouped = {}

    for index, report in enumerate(reports):
        observation = report.get("observation")

        if not isinstance(observation, str):
            continue

        text = set(_normalize(observation).split())

        positive = bool(text & POSITIVE_TERMS)
        negative = bool(text & NEGATIVE_TERMS)

        if positive == negative:
            continue

        key = (
            report.get("location_id"),
            results[index]["category"],
        )

        grouped.setdefault(key, []).append((index, positive))

    for entries in grouped.values():
        polarities = {positive for _, positive in entries}

        if len(polarities) > 1:
            for index, _ in entries:
                results[index]["conflict"] = True
                results[index]["quality_flags"].append(
                    "CONFLICTING_REPORTS"
                )
                results[index]["status"] = "conflicting"
                results[index]["eligible_for_operational_assessment"] = False

    for result in results:
        result.pop("duplicate_key", None)

    return {
        "total": len(results),
        "demo_eligible": sum(
            item["eligible_for_demo"] for item in results
        ),
        "operationally_eligible": sum(
            item["eligible_for_operational_assessment"]
            for item in results
        ),
        "reports": results,
    }
