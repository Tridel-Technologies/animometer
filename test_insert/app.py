import psycopg2
import random
from datetime import datetime, timedelta, timezone

# DB connection
conn = psycopg2.connect(
    host="localhost",
    database="db_anemometer",
    user="postgres",
    password="Tridel@qp@2025",
    port=5433
)

cur = conn.cursor()

# ---- CONFIG ----
start_datetime = datetime(2026, 1, 20, 0, 0, tzinfo=timezone.utc)  # given date
rows_to_insert = 144   # 24 hours * 6 (10-min intervals)
interval = timedelta(minutes=10)
# ----------------

current_time = start_datetime

for _ in range(rows_to_insert):
    cur.execute(
        """
        INSERT INTO tb_wind
        (dateTime, wind_uv, wind_uy, wind_uz, rain_fall, temp, solar_rad, lat, lon)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            current_time,
            random.uniform(-10, 10),
            random.uniform(-10, 10),
            random.uniform(-5, 5),
            random.uniform(0, 50),
            random.uniform(15, 45),
            random.uniform(0, 1200),
            random.uniform(-90, 90),
            random.uniform(-180, 180)
        )
    )

    current_time += interval  # 🔥 move forward 10 minutes

conn.commit()
cur.close()
conn.close()

print("10-minute interval data inserted successfully.")
