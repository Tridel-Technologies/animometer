import serial
import serial.tools.list_ports
import time
import os

print("Hello World")

baud_rate = 9600
timeout_duration = 1
outputDir = "data"

os.makedirs(outputDir, exist_ok=True)

def fileNameCreate(data):
    splited = data.split(",")
    datee = splited[0]
    timee = splited[1]

    date = datee.split("/")
    timee = timee.split(":")

    return f"{date[1]}{date[0]}{date[2]}_{timee[0]}{timee[1]}{timee[2]}"


def find_active_port():
    ports = list(serial.tools.list_ports.comports())

    if not ports:
        print("No serial ports found.")
        return None

    print("Available ports:")
    for port in ports:
        print(f" - {port.device} : {port.description}")

    for port in ports:
        print(f"\nTrying {port.device} for 5 seconds...")

        try:
            ser = serial.Serial(port.device, baud_rate, timeout=timeout_duration)
            time.sleep(2)

            start_time = time.time()

            while time.time() - start_time < 5:
                if ser.in_waiting > 0:
                    print(f"Data detected on {port.device}")
                    return ser

            ser.close()
            print(f"No data on {port.device}")

        except serial.SerialException as e:
            print(f"Error opening {port.device}: {e}")

    return None


ser = find_active_port()

if ser is None:
    print("No active serial device found.")
    exit()

print(f"Listening on {ser.port}")

try:
    while True:
        if ser.in_waiting > 90:
            raw_data = ser.readline()

            try:
                decoded_data = raw_data.decode("utf-8", errors="ignore").strip()
            except:
                decoded_data = str(raw_data)

            if decoded_data:
                file_name = f"{fileNameCreate(decoded_data)}.csv"

                print(f"Received: {decoded_data}")

                with open(f"{outputDir}/{file_name}", "w", encoding="utf-8") as file:
                    file.write(decoded_data)

except KeyboardInterrupt:
    print("\nStopped by user.")

finally:
    if ser.is_open:
        ser.close()
        print("Serial port closed.")