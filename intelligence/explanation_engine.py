
from typing import Optional


RISK_WEIGHTS = {
    "E": 0.35,
    "G": 0.30,
    "P": 0.15,
    "V": 0.10,
    "C": 0.10,
}

RISK_NAMES = {
    "E": "Electrical conductivity anomaly",
    "G": "Groundwater head decline",
    "P": "Rainfall deficit",
    "V": "Vegetation stress",
    "C": "Coastal susceptibility",
}

CONFIDENCE_WEIGHTS = {
    "Q": 0.30,
    "F": 0.25,
    "C": 0.30,
    "S": 0.15,
}

CONFIDENCE_NAMES = {
    "Q": "Data quality",
    "F": "Data freshness",
    "C": "Data completeness",
    "S": "Spatial coverage",
}

MONITORING_WEIGHTS = {
    "R": 0.30,
    "N": 0.20,
    "D": 0.20,
    "M": 0.30,
}

MONITORING_NAMES = {
    "R": "Existing risk indicator",
    "N": "Nearby-well evidence",
    "D": "Monitoring-station gap",
    "M": "Missing or outdated data need",
}


def explain_weighted_score(
    indicators: dict[str, Optional[float]],
    weights: dict[str, float],
    names: dict[str, str],
    result: dict,
    score_key: str = "score",
) -> dict:
    """Explain a weighted score without changing its calculation."""

    available = {
        key: value
        for key, value in indicators.items()
        if key in weights and value is not None
    }

    missing = [
        names[key]
        for key in weights
        if indicators.get(key) is None
    ]

    coverage = sum(weights[key] for key in available)

    contributions = []

    if coverage > 0:
        for key, value in available.items():
            contribution = (
                weights[key] * value / coverage * 100
            )

            contributions.append({
                "indicator": key,
                "name": names[key],
                "value": value,
                "weight": weights[key],
                "contribution_points": round(contribution, 2),
            })

    contributions.sort(
        key=lambda item: item["contribution_points"],
        reverse=True,
    )

    return {
        "score": result.get(score_key),
        "status": result.get("status"),
        "coverage": round(coverage, 4),
        "contributions": contributions,
        "missing_inputs": missing,
        "explanation": (
            "Contributions show how each available indicator "
            "participated in the weighted score. Missing indicators "
            "are excluded, not treated as zero."
        ),
    }


def explain_assessment(
    risk_indicators: dict,
    confidence_indicators: dict,
    monitoring_indicators: dict,
    risk: dict,
    confidence: dict,
    monitoring: dict,
    is_simulated: bool = False,
) -> dict:

    risk_explanation = explain_weighted_score(
        risk_indicators,
        RISK_WEIGHTS,
        RISK_NAMES,
        risk,
    )

    confidence_explanation = explain_weighted_score(
        confidence_indicators,
        CONFIDENCE_WEIGHTS,
        CONFIDENCE_NAMES,
        confidence,
    )

    monitoring_inputs = {
        "R": (
            risk["score"] / 100
            if risk.get("score") is not None
            else None
        ),
        **monitoring_indicators,
    }

    monitoring_explanation = explain_weighted_score(
        monitoring_inputs,
        MONITORING_WEIGHTS,
        MONITORING_NAMES,
        monitoring,
        score_key="priority_score",
    )

    if is_simulated:
        confidence_explanation["explanation"] = (
            "This assessment uses simulated evidence. "
            "It cannot establish operational confidence."
        )

    limitations = []

    if is_simulated:
        limitations.append(
            "Simulated evidence must not be interpreted as "
            "verified field observations."
        )

    if risk.get("score") is None:
        limitations.append(
            "Risk score is unavailable because evidence coverage "
            "is insufficient."
        )

    if confidence.get("score") is None:
        limitations.append(
            "Operational confidence could not be established."
        )

    if risk_explanation["missing_inputs"]:
        limitations.append(
            "Some risk indicators are missing."
        )

    return {
        "risk_explanation": risk_explanation,
        "confidence_explanation": confidence_explanation,
        "monitoring_explanation": monitoring_explanation,
        "limitations": limitations,
        "disclaimer": (
            "These explanations describe the project's weighted "
            "calculations. They do not establish causation or "
            "confirm seawater intrusion."
        ),
    }
