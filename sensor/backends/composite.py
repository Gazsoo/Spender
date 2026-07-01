import logging

from .base import SensorBackend, SensorReading
from .ds18b20 import Ds18b20Backend
from .sensehat import SenseHatBackend

log = logging.getLogger(__name__)


class CompositeBackend(SensorBackend):
    """Room temperature from a DS18B20 (accurate, unaffected by Pi heat);
    humidity and pressure from the Sense HAT.

    If the DS18B20 is unavailable, falls back to the Sense HAT's own
    temperature and reports `source="sensehat"` so the server re-applies
    CPU-heat compensation and the UI can flag the degraded reading.
    """

    def __init__(self) -> None:
        self._hat = SenseHatBackend()
        self._ds18b20 = Ds18b20Backend()

    def read(self) -> SensorReading:
        hat = self._hat.read()
        try:
            temperature = self._ds18b20.read().temperature
            source = "ds18b20"
        except Exception as exc:
            log.warning("DS18B20 unavailable, falling back to Sense HAT temperature: %s", exc)
            temperature = hat.temperature
            source = "sensehat"
        return SensorReading(
            temperature=temperature,
            humidity=hat.humidity,
            pressure=hat.pressure,
            source=source,
        )

    def close(self) -> None:
        self._hat.close()
        self._ds18b20.close()
