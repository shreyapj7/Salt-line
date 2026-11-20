import math
import pytest

from intelligence.indicators.ec_anomaly import calculate_ec_anomaly


def baseline():
    values = [400, 420, 410, 430, 405]
    logs = [math.log(x) for x in values]

    import statistics

    median_log = statistics.median(logs)
    mad = statistics.median(
        abs(x - median_log) for x in logs
    )

    return {
        "baseline_status": "calculated",
        "baseline_ec25_uS_cm": 410,
        "median_log_ec": median_log,
        "log_mad": mad,
    }


def test_increased_ec_is_detected():
    result = calculate_ec_anomaly(500, baseline())

    assert result["anomaly_status"] == "calculated"
    assert result["direction"] == "increased"
    assert result["percentage_deviation"] == pytest.approx(
        21.9512, abs=0.001
    )
    assert result["robust_z_score"] > 0


def test_decreased_ec_is_detected():
    result = calculate_ec_anomaly(350, baseline())

    assert result["direction"] == "decreased"
    assert result["robust_z_score"] < 0


def test_unchanged_ec_has_zero_deviation():
    result = calculate_ec_anomaly(410, baseline())

    assert result["direction"] == "unchanged"
    assert result["percentage_deviation"] == 0


def test_unavailable_baseline_returns_unknown_anomaly():
    result = calculate_ec_anomaly(
        500,
        {"baseline_status": "unavailable"},
    )

    assert result["anomaly_status"] == "baseline_unavailable"
    assert result["robust_z_score"] is None
    assert result["direction"] == "unknown"


def test_zero_dispersion_does_not_divide_by_zero():
    result = calculate_ec_anomaly(
        500,
        {
            "baseline_status": "calculated",
            "baseline_ec25_uS_cm": 400,
            "median_log_ec": math.log(400),
            "log_mad": 0,
        },
    )

    assert result["robust_z_score"] is None
    assert result["dispersion_status"] == "zero_baseline_dispersion"


@pytest.mark.parametrize("value", [0, -1, float("nan"), float("inf"), True])
def test_invalid_current_ec_is_rejected(value):
    with pytest.raises(ValueError):
        calculate_ec_anomaly(value, baseline())
