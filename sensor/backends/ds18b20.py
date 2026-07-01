import glob
import os

from .base import SensorBackend, SensorReading


class Ds18b20Backend(SensorBackend):
    """Reads temperature from a DS18B20 1-wire sensor via sysfs.

    The device exposes a `temperature` file holding milli-degrees Celsius
    (e.g. `23125` -> 23.125 °C). Humidity and pressure are not available.

    The device path defaults to the DS18B20_DEVICE env var, otherwise the
    first sensor matching `/sys/bus/w1/devices/28-*/temperature` is used
    (family code 28 == DS18B20). Discovery happens on each read so a sensor
    that is (re)connected after startup is picked up automatically.
    """

    DEVICE_GLOB = "/sys/bus/w1/devices/28-*/temperature"

    def __init__(self, device: str | None = None) -> None:
        self._device = device or os.getenv("DS18B20_DEVICE")

    def _resolve(self) -> str:
        if self._device:
            return self._device
        matches = sorted(glob.glob(self.DEVICE_GLOB))
        if not matches:
            raise FileNotFoundError(f"No DS18B20 sensor found matching {self.DEVICE_GLOB}")
        return matches[0]

    def read(self) -> SensorReading:
        with open(self._resolve()) as f:
            milli = int(f.read().strip())
        return SensorReading(
            temperature=round(milli / 1000.0, 3),
            humidity=0.0,
            pressure=0.0,
            source="ds18b20",
        )
