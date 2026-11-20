"""EC anomaly calculations against a validated baseline."""

import math


def calculate_ec_anomaly(
    current_ec25_uS_cm: float,
    baseline: dict,
) -> dict:
    """Calculate percentage deviation and robust log-scale anomaly."""

    if (
        isinstance(current_ec25_uS_cm, bool)
        or not isinstance(current_ec25_uS_cm, (int, float))
        or not math.isfinite(current_ec25_uS_cm)
        or current_ec25_uS_cm <= 0
    ):
        raise ValueError("current EC25 must be a finite positive number")

    if not isinstance(baseline, dict):
        raise TypeError("baseline must be a dictionary")

    if baseline.get("baseline_status") != "calculated":
        return {
            "anomaly_status": "baseline_unavailable",
            "ec25_uS_cm": float(current_ec25_uS_cm),
            "percentage_deviation": None,
            "robust_z_score": None,
            "direction": "unknown",
            "reason": baseline.get(
                "reason", "A valid baseline is required"
            ),
        }

    baseline_ec = baseline.get("baseline_ec25_uS_cm")
    median_log = baseline.get("median_log_ec")
    log_mad = baseline.get("log_mad")

    values = (baseline_ec, median_log, log_mad)

    if any(
        isinstance(v, bool)
        or not isinstance(v, (int, float))
        or not math.isfinite(v)
        for v in values
    ):
        raise ValueError("Baseline contains invalid statistical values")

    if baseline_ec <= 0 or log_mad < 0:
        raise ValueError("Baseline statistics are invalid")

    current = float(current_ec25_uS_cm)

    percentage = (
        (current - baseline_ec) / baseline_ec
    ) * 100

    direction = (
        "increased" if current > baseline_ec
        else "decreased" if current < baseline_ec
        else "unchanged"
    )

    if log_mad == 0:
        robust_z = None
        dispersion_status = "zero_baseline_dispersion"
    else:
        robust_z = (
            math.log(current) - median_log
        ) / (1.4826 * log_mad)
        dispersion_status = "calculated"

    return {
        "anomaly_status": "calculated",
        "ec25_uS_cm": current,
        "baseline_ec25_uS_cm": baseline_ec,
        "percentage_deviation": round(percentage, 4),
        "robust_z_score": (
            round(robust_z, 4) if robust_z is not None else None
        ),
        "direction": direction,
        "dispersion_status": dispersion_status,
        "reason": None,
    }
