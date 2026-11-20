import sqlite3

from intelligence.sensor_adapter import evaluate_sensor_batch

connection = sqlite3.connect("backend/saltline.db")
connection.row_factory = sqlite3.Row

rows = connection.execute("""
    SELECT *
    FROM sensor_readings
    ORDER BY id
""").fetchall()

readings = [dict(row) for row in rows]

result = evaluate_sensor_batch(readings)

print("SENSOR ELIGIBILITY REPORT")
print("=========================")
print("Total:", result["total"])
print("Storage eligible:", result["storage_eligible"])
print("Conversion eligible:", result["conversion_eligible"])
print("Operationally eligible:", result["operationally_eligible"])

for reading in result["readings"]:
    print(
        f"\nID: {reading['reading_id']}"
        f"\nStatus: {reading['status']}"
        f"\nReasons: {reading['reasons']}"
        f"\nWarnings: {reading['warnings']}"
    )

connection.close()