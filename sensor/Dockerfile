FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN apt-get update && apt-get install -y --no-install-recommends build-essential cmake \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y build-essential cmake \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

COPY main.py .
COPY backends/ ./backends/

CMD ["python", "main.py"]
