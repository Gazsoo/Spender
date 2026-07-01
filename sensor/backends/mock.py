import math
import random
import time

from .base import SensorBackend, SensorReading


class MockBackend(SensorBackend):
    """Generates realistic-looking sensor readings without any hardware."""

    def read(self) -> SensorReading:
        # Gentle sine wave so values drift naturally over time
        t = time.time()
        temperature = 22.5 + 2.0 * math.sin(t / 60) + random.uniform(-0.2, 0.2)
        humidity = 55.0 + 5.0 * math.sin(t / 120 + 1) + random.uniform(-0.5, 0.5)
        pressure = 1013.0 + 3.0 * math.sin(t / 300 + 2) + random.uniform(-0.1, 0.1)
        return SensorReading(
            temperature=round(temperature, 2),
            humidity=round(humidity, 2),
            pressure=round(pressure, 2),
            source="mock",
        )
