from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class SensorReading:
    temperature: float
    humidity: float
    pressure: float


class SensorBackend(ABC):
    @abstractmethod
    def read(self) -> SensorReading: ...

    def close(self) -> None:
        pass
