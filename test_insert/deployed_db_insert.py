import os
import psycopg2
from datetime import datetime

DATA_FOLDER = "data"
PROCESSED_LOG = "processed_files.txt"
INVALID_LOG = "invalid_files.txt"

DB_CONFIG = {
    "host": "localhost",
    "database": "db_animometer",
    "user": "tridel",
    "password": "Tridel@1t@animometer",
    "port": 5432
}

STATION_NAME = "SAGAR MANJUSHA"
LAT = 11.166655
LON = 75.807869
ALTITUDE = 0.0


def load_log(file):
    if not os.path.exists(file):
        return set()

    with open(file, "r") as f:
        return set(line.strip() for line in f)


def save_log(file, name):
    with open(file, "a") as f:
        f.write(name + "\n")


def parse_file(filepath):

    with open(filepath, "r", encoding="utf-8") as f:
        line = f.readline().strip()

    parts = line.split(",")

    if len(parts) != 14:
        raise ValueError("Invalid column count")

    date = parts[0]
    time = parts[1]
    dt = datetime.strptime(f"{date} {time}", "%d/%m/%Y %H:%M:%S")

    row = (
        float(parts[2]),   # wind_uv
        float(parts[3]),   # wind_uy
        float(parts[4]),   # wind_uz
        float(parts[8]),   # rain_fall
        float(parts[9]),   # temp
        float(parts[6]),   # solar_rad
        LAT,
        LON,
        dt,
        float(parts[10]),  # humidity
        float(parts[7]),   # pressure
        float(parts[13]),  # battery
        STATION_NAME,
        ALTITUDE,
        float(parts[11]),  # wind_speed
        float(parts[12]),  # wind_direction
        float(parts[5])    # sos
    )

    return row


def main():

    print("Starting import...")

    if not os.path.exists(DATA_FOLDER):
        print("Data folder not found")
        return

    processed = load_log(PROCESSED_LOG)
    invalid = load_log(INVALID_LOG)

    skipped = processed.union(invalid)

    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    for file in os.listdir(DATA_FOLDER):

        if not file.endswith(".csv"):
            continue

        if file in skipped:
            continue

        filepath = os.path.join(DATA_FOLDER, file)

        print("Processing:", file)

        try:

            row = parse_file(filepath)

            insert_query = """
            INSERT INTO tb_wind
            (wind_uv, wind_uy, wind_uz, rain_fall, temp, solar_rad,
             lat, lon, datetime, humidity, pressure, battery,
             station_name, altitude, wind_speed, wind_direction, sos)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """

            cursor.execute(insert_query, row)
            conn.commit()

            save_log(PROCESSED_LOG, file)

            print("Inserted:", file)

        except Exception as e:

            conn.rollback()

            print("Invalid file:", file, "| Error:", e)

            save_log(INVALID_LOG, file)

    cursor.close()
    conn.close()

    print("Import finished")


if __name__ == "__main__":
    main()