from .base import SensorBackend, SensorReading


class SenseHatBackend(SensorBackend):
    def __init__(self) -> None:
        from sense_hat import SenseHat  # only imported on Pi
        self._hat = SenseHat()
        self._hat.clear()

    def read(self) -> SensorReading:
        return SensorReading(
            temperature=self._hat.get_temperature(),
            humidity=self._hat.get_humidity(),
            pressure=self._hat.get_pressure(),
        )

    def close(self) -> None:
        self._hat.clear()
