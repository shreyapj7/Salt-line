
import json
import urllib.request
import urllib.error

API_URL = "http://127.0.0.1:8000/api/v1/sensor-readings"

test_readings = [
    (1200, 1800, 25.0, False),
    (1800, 2100, 26.0, False),
    (2400, 2200, 27.0, False),
    (3000, 2500, 28.0, False),
    (3500, 3000, None, False),
    (2900, 4095, 28.0, True),
]

for index, (tds, water, temperature, warning) in enumerate(
    test_readings, start=1
):
    payload = {
        "device_id": "saltline_test_device",
        "uptime_ms": index * 10000,
        "tds_raw_avg": tds,
        "water_level_raw_avg": water,
        "tds_voltage_est_v": round(tds * 3.3 / 4095, 3),
        "water_voltage_est_v": round(water * 3.3 / 4095, 3),
        "input_warning": warning,
        "temperature_c": temperature,
        "temperature_valid": temperature is not None,
        "source": "synthetic_integration_test",
    }

    request = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request) as response:
            result = json.loads(response.read().decode())
            print(
                f"Reading {index}: stored successfully, "
                f"ID={result.get('id')}"
            )

    except urllib.error.HTTPError as error:
        print(f"Reading {index}: HTTP {error.code}")
        print(error.read().decode())

    except urllib.error.URLError as error:
        print(f"Connection error: {error.reason}")
