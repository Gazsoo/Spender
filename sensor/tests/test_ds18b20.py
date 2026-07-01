import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backends.ds18b20 import Ds18b20Backend  # noqa: E402


class Ds18b20BackendTests(unittest.TestCase):
    def _write_device(self, milli: str) -> str:
        fd, path = tempfile.mkstemp()
        with os.fdopen(fd, "w") as f:
            f.write(milli + "\n")
        self.addCleanup(os.unlink, path)
        return path

    def test_parses_milli_degrees(self):
        path = self._write_device("23125")
        reading = Ds18b20Backend(device=path).read()
        self.assertAlmostEqual(reading.temperature, 23.125, places=3)
        self.assertEqual(reading.source, "ds18b20")
        self.assertEqual(reading.humidity, 0.0)
        self.assertEqual(reading.pressure, 0.0)

    def test_handles_negative_temperature(self):
        path = self._write_device("-4500")
        reading = Ds18b20Backend(device=path).read()
        self.assertAlmostEqual(reading.temperature, -4.5, places=3)

    def test_env_var_used_when_no_explicit_device(self):
        path = self._write_device("19000")
        os.environ["DS18B20_DEVICE"] = path
        self.addCleanup(os.environ.pop, "DS18B20_DEVICE", None)
        reading = Ds18b20Backend().read()
        self.assertAlmostEqual(reading.temperature, 19.0, places=3)

    def test_missing_device_raises(self):
        backend = Ds18b20Backend(device="/nonexistent/28-deadbeef/temperature")
        with self.assertRaises(FileNotFoundError):
            backend.read()


if __name__ == "__main__":
    unittest.main()
