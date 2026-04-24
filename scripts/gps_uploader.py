import os
import re
import time
from datetime import datetime, timezone

import requests
import serial
from serial import SerialException


def load_env_file(env_path: str) -> None:
    if not os.path.exists(env_path):
        return

    with open(env_path, "r", encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


def parse_lat_lng(line: str):
    line = line.strip()
    if not line:
        return None

    # Format: "lat,lng"
    pair_match = re.match(r"^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$", line)
    if pair_match:
        lat = float(pair_match.group(1))
        lng = float(pair_match.group(2))
        return lat, lng

    # Format: "lat\\lng" (as seen in some LoRa relay outputs)
    slash_match = re.match(r"^\s*(-?\d+\.\d+)\s*[\\/]\s*(-?\d+\.\d+)\s*$", line)
    if slash_match:
        lat = float(slash_match.group(1))
        lng = float(slash_match.group(2))
        return lat, lng

    # Format: "LAT:xx,LNG:yy" or "latitude=xx longitude=yy"
    named_match = re.search(
        r"(?:lat|latitude)\s*[:=]\s*(-?\d+\.\d+).*?(?:lng|lon|longitude)\s*[:=]\s*(-?\d+\.\d+)",
        line,
        flags=re.IGNORECASE,
    )
    if named_match:
        lat = float(named_match.group(1))
        lng = float(named_match.group(2))
        return lat, lng

    return None


def is_valid_coordinate(lat: float, lng: float) -> bool:
    return -90 <= lat <= 90 and -180 <= lng <= 180


def upsert_location(supabase_url: str, service_key: str, device_id: str, lat: float, lng: float) -> None:
    endpoint = f"{supabase_url}/rest/v1/device_locations"
    params = {"on_conflict": "device_id"}
    now_utc = datetime.now(timezone.utc).isoformat()
    payload = [{
        "device_id": device_id,
        "lat": lat,
        "lng": lng,
        "updated_at": now_utc,
    }]
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    response = requests.post(endpoint, params=params, json=payload, headers=headers, timeout=10)
    response.raise_for_status()


def main() -> None:
    load_env_file(".env.bridge")

    supabase_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    device_id = os.getenv("GPS_DEVICE_ID", "arduino_gps_1").strip()
    serial_port = os.getenv("SERIAL_PORT", "COM3").strip()
    baud_rate = int(os.getenv("BAUD_RATE", "9600"))

    if not supabase_url or not service_role_key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.bridge")

    print(f"Starting GPS uploader on {serial_port} @ {baud_rate} baud")
    print(f"Uploading device_id='{device_id}' to {supabase_url}")

    reconnect_delay_seconds = 3
    last_serial_error = None

    while True:
        try:
            with serial.Serial(serial_port, baud_rate, timeout=2) as ser:
                print(f"Connected to {serial_port}")
                last_serial_error = None

                while True:
                    raw = ser.readline().decode("utf-8", errors="ignore").strip()
                    if not raw:
                        continue

                    parsed = parse_lat_lng(raw)
                    if not parsed:
                        print(f"Skipped unparsable line: {raw}")
                        continue

                    lat, lng = parsed
                    if not is_valid_coordinate(lat, lng):
                        print(f"Skipped invalid coordinate: lat={lat}, lng={lng}")
                        continue

                    upsert_location(supabase_url, service_role_key, device_id, lat, lng)
                    print(f"Uploaded: {lat:.6f}, {lng:.6f}")
                    time.sleep(1)
        except KeyboardInterrupt:
            print("\nStopped by user.")
            break
        except SerialException as err:
            # Serial access/disconnect errors are common on Windows; reconnect instead of spamming logs.
            message = str(err)
            if message != last_serial_error:
                print(f"Serial error on {serial_port}: {err}")
                last_serial_error = message
            print(f"Retrying serial connection in {reconnect_delay_seconds}s...")
            time.sleep(reconnect_delay_seconds)
        except Exception as err:
            print(f"Upload error: {err}")
            time.sleep(2)


if __name__ == "__main__":
    main()
