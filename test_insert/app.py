import psycopg2
import random
import time
import math
from datetime import datetime, timezone

# DB connection config
DB_CONFIG = {
    "host": "localhost",
    "database": "db_anemometer",
    "user": "postgres",
    "password": "Tridel@qp@2025",
    "port": 5433
}

# --- OCEAN SIMULATION STATE ---
# We use a stateful approach to simulate environmental "flows" (Random Walk/Sinusoidal)
state = {
    "temp": 26.5,
    "humidity": 78.0,
    "pressure": 1012.5,
    "wind_uv": 4.2,
    "wind_uy": -2.1,
    "wind_uz": 0.5,
    "battery": 98.2,
    "lat": 11.9416, # Center of Pondicherry coast
    "lon": 79.8083,
}

def get_solar_rad(dt):
    """Simulates solar radiation based on hour of day (0 at night, peak at noon)"""
    hour = dt.hour + dt.minute/60.0
    # Bell curve approximation: peak at 12:00
    if 6 <= hour <= 18:
        # Scale radiation based on proximity to 12pm
        return 1100 * math.sin(math.pi * (hour - 6) / 12) * random.uniform(0.9, 1.1)
    return 0.0

def update_state():
    """Performs a tiny 'random walk' for each parameter to simulate fluid environmental changes"""
    state["temp"] = max(15.0, min(42.0, state["temp"] + random.uniform(-0.1, 0.1)))
    state["humidity"] = max(30.0, min(98.0, state["humidity"] + random.uniform(-0.2, 0.2)))
    state["pressure"] = max(950.0, min(1060.0, state["pressure"] + random.uniform(-0.05, 0.05)))
    state["wind_uv"] = max(0, min(50.0, state["wind_uv"] + random.uniform(-0.3, 0.3)))
    state["wind_uy"] = max(0, min(25.0, state["wind_uy"] + random.uniform(-0.3, 0.3)))
    state["wind_uz"] = max(0, min(15.0, state["wind_uz"] + random.uniform(-0.1, 0.1)))
    state["battery"] -= 0.001 # Slow drain simulation
    if state["battery"] < 10: state["battery"] = 100.0 # Simulate recharge
    
    # Slight drift in position (vessel movement)
    state["lat"] += random.uniform(-0.00001, 0.00001)
    state["lon"] += random.uniform(-0.00001, 0.00001)

def start_live_insertion():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        print("Connected to database. Starting realistic Ocean Telemetry Simulation...")
        
        # Fetch station name once at start
        cur.execute("SELECT name FROM tb_stations LIMIT 1")
        station_row = cur.fetchone()
        station_name = station_row[0] if station_row else "Unknown Station"
        print(f"Station Identity: {station_name}")
        print("Location: Pondicherry Coast (Bay of Bengal)")
        print("Press Ctrl+C to stop.")

        while True:
            current_time = datetime.now(timezone.utc)
            update_state()
            
            solar = get_solar_rad(current_time)
            # Occasional rainfall logic (1% chance to start/stop rain)
            rain = random.uniform(0, 5) if random.random() > 0.95 else 0.0

            cur.execute(
                """
                INSERT INTO tb_wind 
                (dateTime, wind_uv, wind_uy, wind_uz, rain_fall, temp, solar_rad, lat, lon, humidity, pressure, battery, station_name) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    current_time,
                    state["wind_uv"],
                    state["wind_uy"],
                    state["wind_uz"],
                    rain,
                    state["temp"],
                    solar,
                    state["lat"],
                    state["lon"],
                    state["humidity"],
                    state["pressure"],
                    state["battery"],
                    station_name
                )
            )

            conn.commit()
            print(f"[{current_time.strftime('%H:%M:%S')}] T: {state['temp']:.1f}°C | W: {abs(state['wind_uv']):.1f}m/s | S: {solar:.0f}W/m² | B: {state['battery']:.1f}%")
            
            time.sleep(1)

    except KeyboardInterrupt:
        print("\nSimulation stopped.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    start_live_insertion()
