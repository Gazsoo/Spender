FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
# Build RTIMU from source first — the sense-hat wheel doesn't bundle it.
# RTIMULib's Python setup.py compiles it with g++ (no cmake needed).
RUN apt-get update && apt-get install -y --no-install-recommends build-essential git \
    && git clone --depth=1 https://github.com/RPi-Distro/RTIMULib.git /tmp/rtimulib \
    && pip install --no-cache-dir setuptools \
    && cd /tmp/rtimulib/Linux/python && python setup.py install && cd /app \
    && rm -rf /tmp/rtimulib \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y build-essential git \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

COPY main.py .
COPY backends/ ./backends/

CMD ["python", "main.py"]
