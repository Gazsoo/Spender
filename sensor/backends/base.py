from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class SensorReading:
    temperature: float
    humidity: float
    pressure: float
    # Which sensor produced `temperature`. The server uses this to decide
    # whether CPU-heat compensation applies (only the self-heating Sense HAT).
    source: str = "sensehat"


class SensorBackend(ABC):
    @abstractmethod
    def read(self) -> SensorReading: ...

    def close(self) -> None:
        pass
