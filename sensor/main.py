#!/usr/bin/env python3
"""Sense HAT sensor service — reads sensors and POSTs to the Spender API."""
import logging
import os
import time

import requests

from backends.base import SensorBackend, SensorReading
from backends.composite import CompositeBackend
from backends.ds18b20 import Ds18b20Backend
from backends.mock import MockBackend
from backends.sensehat import SenseHatBackend

API_URL = os.getenv("API_URL", "http://api:5020")
INTERVAL = int(os.getenv("POLL_INTERVAL_SECONDS", "30"))
SENSOR_BACKEND = os.getenv("SENSOR_BACKEND", "sensehat").lower()
INGEST_URL = f"{API_URL}/api/home/ingest"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger(__name__)


def build_backend() -> SensorBackend:
    if SENSOR_BACKEND == "mock":
        log.info("Using mock sensor backend")
        return MockBackend()
    if SENSOR_BACKEND == "ds18b20":
        log.info("Using DS18B20 sensor backend")
        return Ds18b20Backend()
    if SENSOR_BACKEND == "composite":
        log.info("Using composite backend (DS18B20 temperature + Sense HAT humidity/pressure)")
        return CompositeBackend()
    log.info("Using Sense HAT backend")
    return SenseHatBackend()


def get_cpu_temp() -> float | None:
    try:
        with open("/sys/class/thermal/thermal_zone0/temp") as f:
            return int(f.read().strip()) / 1000.0
    except Exception as exc:
        log.debug("Could not read CPU temp: %s", exc)
        return None


def post_reading(reading: SensorReading, cpu: float | None) -> None:
    payload = {
        "temperatureRaw": reading.temperature,
        "humidity": reading.humidity,
        "pressure": reading.pressure,
        "cpuTemperature": round(cpu, 2) if cpu is not None else None,
        "temperatureSource": reading.source,
    }
    resp = requests.post(INGEST_URL, json=payload, timeout=10)
    resp.raise_for_status()


def main() -> None:
    log.info("Starting. backend=%s api=%s interval=%ss", SENSOR_BACKEND, API_URL, INTERVAL)
    backend = build_backend()
    time.sleep(5)

    try:
        while True:
            try:
                reading = backend.read()
                cpu = get_cpu_temp()
                post_reading(reading, cpu)
                log.info(
                    "Posted: temp=%.2f°C (%s)  hum=%.1f%%  pres=%.1f hPa  cpu=%s°C",
                    reading.temperature,
                    reading.source,
                    reading.humidity,
                    reading.pressure,
                    f"{cpu:.1f}" if cpu is not None else "n/a",
                )
            except requests.HTTPError as exc:
                log.error("API rejected reading: %s", exc)
            except Exception as exc:
                log.error("Read/post failed: %s", exc)

            time.sleep(INTERVAL)
    finally:
        backend.close()


if __name__ == "__main__":
    main()
