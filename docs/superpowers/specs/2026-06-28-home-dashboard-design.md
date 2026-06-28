# Home Dashboard — Design Spec

**Date:** 2026-06-28  
**Feature:** `/home` page with Sense HAT sensor readings + HungaroMet + Open-Meteo weather  
**Status:** Approved, ready for implementation planning

---

## Overview

A new `/home` page added to the existing Spender React app. Displays three columns of live environmental data: in-room Sense HAT readings, nearest official weather station (HungaroMet), and model-based current + forecast (Open-Meteo). Polls every 30 seconds.

---

## Architecture

```
Python (sensor/)          Spender.Home (.NET)          React /home page
─────────────────         ─────────────────────        ─────────────────
Sense HAT read            SensorIngestService          polls GET /api/home
every 30s          POST→  stores to SensorReadings     every 30 seconds
                          table (time-series)
                                                        3-column layout:
                          WeatherBackgroundService      ① HAT readings
HungaroMet CSV    ←poll─  every 10 min:                ② HungaroMet
Open-Meteo API    ←poll─   fetch + parse               ③ Open-Meteo
                           upsert WeatherCache          + forecast strip
                           table (latest per source)
```

**New pieces:**

| Piece | What it is |
|---|---|
| `sensor/` | Python Sense HAT reader service (new docker-compose service) |
| `Spender.Home/` | New .NET microservice project |
| `SensorReadings` table | Time-series sensor data in PostgreSQL |
| `WeatherCache` table | Latest fetch per weather source (2 rows, persistent) |
| `HomeEndpoints.cs` | `GET /api/home` + `POST /api/home/ingest` in Spender.API |
| `src/pages/home/` | New React page at `/home` |

Nothing in Transactions, Categories, or Analytics is touched.

---

## Data Sources

### HAT — Sense HAT (in-room, in-process)
- **Library:** `sense-hat` Python package
- **Channels used:** temperature, humidity, pressure
- **CPU heat compensation:** `t_compensated = t_hat - (cpu_temp - 25) * factor` (factor ~0.5, tunable via env var)
- **Derived:** dew point (Magnus formula), feels like (Heat Index — temp + humidity, no wind indoors)
- **Cadence:** every 30 seconds

### HungaroMet — Budapest Lágymányos (station 44505)
- **Source:** `https://odp.met.hu/weather/weather_reports/synoptic/hungary/10_minutes/`
- **Format:** ISO-8859-1, semicolon-separated, space-padded fixed-width fields
- **Station coords:** 47.4747°N, 19.0619°E — ~0.8 km from home
- **Fields used:** `t` (temp), `u` (humidity), `p` (pressure), `fs`/`fsd` (wind speed/direction)
- **Quality control:** check `Q_` flag columns; skip values with non-zero QC flag
- **Feels like:** computed server-side from temp + humidity + wind speed
- **Cadence:** every 10 minutes

### Open-Meteo (modeled, exact home coordinates)
- **Coords:** 47.4719°N, 19.0519°E
- **Free, no API key**
- **Variables requested:** `temperature_2m`, `relative_humidity_2m`, `surface_pressure`, `wind_speed_10m`, `apparent_temperature`, `weather_code`
- **Forecast:** daily `temperature_2m_min`, `temperature_2m_max`, `weather_code`, `precipitation_sum` — 4 days
- **Feels like:** `apparent_temperature` from API directly
- **Cadence:** every 10 minutes

---

## Backend — `Spender.Home/`

Follows the same pattern as `Spender.Transactions` — a separate `.csproj` registered into `Spender.API` via DI.

```
Spender.Home/
  Services/
    IHomeDashboardService.cs    ← composes GET /api/home response
    HomeDashboardService.cs
    ISensorIngestService.cs     ← receives + stores HAT readings
    SensorIngestService.cs
  Background/
    WeatherBackgroundService.cs ← IHostedService, polls every 10 min
  Parsers/
    HungaroMetParser.cs         ← downloads + parses CSV, extracts station 44505
    OpenMeteoClient.cs          ← calls API, deserializes current + forecast
  Spender.Home.csproj
```

**Registered in `Spender.API`:**
- `ServiceCollectionExtensions.cs` → `AddHomeServices()`
- `WebApplicationExtensions.cs` → maps `HomeEndpoints`

---

## Database

### `SensorReadings` table

| Column | Type | Notes |
|---|---|---|
| `Id` | int | PK |
| `RecordedAt` | timestamptz | UTC |
| `Temperature` | decimal | Raw from HAT (°C) |
| `TemperatureCompensated` | decimal | After CPU-heat offset |
| `Humidity` | decimal | % |
| `Pressure` | decimal | hPa |
| `DewPoint` | decimal | Derived (Magnus formula) |
| `FeelsLike` | decimal | Heat Index |
| `CpuTemperature` | decimal? | From vcgencmd, nullable |

**Retention:** 7 days. Cleanup runs on each `WeatherBackgroundService` tick.

### `WeatherCache` table

| Column | Type | Notes |
|---|---|---|
| `Source` | varchar | `"HungaroMet"` or `"OpenMeteo"` (unique key) |
| `FetchedAt` | timestamptz | UTC |
| `Payload` | text | JSON-serialized weather data |

Always exactly 2 rows — upserted each poll. Survives API restarts.

---

## API

### `GET /api/home`

Response shape:

```json
{
  "sensor": {
    "temperatureRaw": 24.1,
    "temperatureCompensated": 22.3,
    "humidity": 55.2,
    "pressure": 1013.2,
    "dewPoint": 11.4,
    "feelsLike": 21.0,
    "recordedAt": "2026-06-28T12:04:00Z"
  },
  "hungaromet": {
    "temperature": 19.5,
    "feelsLike": 18.1,
    "humidity": 58.0,
    "pressure": 1012.8,
    "windSpeed": 3.2,
    "windDirection": 270,
    "stationName": "Budapest Lágymányos",
    "observedAt": "2026-06-28T11:50:00Z"
  },
  "openMeteo": {
    "temperature": 20.1,
    "feelsLike": 19.3,
    "humidity": 56.0,
    "pressure": 1013.0,
    "windSpeed": 4.1,
    "weatherCode": 1,
    "updatedAt": "2026-06-28T12:00:00Z",
    "forecast": [
      {
        "date": "2026-06-28",
        "tempMin": 15.2,
        "tempMax": 24.1,
        "weatherCode": 2,
        "precipitationMm": 0.0
      }
    ]
  }
}
```

### `POST /api/home/ingest`

Internal only — called by the Python sensor service via the docker-internal network (`http://api:5020`), not routed through Caddy, so not reachable from the internet. No API key required; docker network isolation is sufficient. Body:

```json
{
  "temperatureRaw": 24.1,
  "humidity": 55.2,
  "pressure": 1013.2,
  "cpuTemperature": 52.3
}
```

Server computes `temperatureCompensated`, `dewPoint`, `feelsLike`, sets `RecordedAt = UtcNow`, stores to `SensorReadings`.

---

## Frontend — `src/pages/home/`

```
src/pages/home/
  HomePage.tsx        ← layout, TanStack Query poll (refetchInterval: 30_000)
  SensorCard.tsx      ← HAT column
  HungarometCard.tsx  ← HungaroMet column
  OpenMeteoCard.tsx   ← Open-Meteo current column
  ForecastStrip.tsx   ← 4-day forecast bar below the three columns
```

**Layout:**

```
┌─────────────────┬─────────────────┬──────────────────────┐
│   In-room (HAT) │   HungaroMet    │     Open-Meteo       │
│  Budapest XI    │  Lágymányos     │   (model, exact loc) │
├─────────────────┼─────────────────┼──────────────────────┤
│  🌡 22.3°C      │  🌡 19.5°C      │  🌡 20.1°C           │
│  Feels like 21° │  Feels like 18° │  Feels like 19°      │
│  💧 55%         │  💧 58%         │  💧 56%              │
│  📊 1013 hPa    │  📊 1012 hPa    │  📊 1013 hPa         │
│  Dew pt 11°C    │  Wind 3 km/h W  │  Wind 4 km/h         │
│  Updated 12:04  │  Obs. 11:50     │  Updated 12:00       │
└─────────────────┴─────────────────┴──────────────────────┘

── 4-day forecast (Open-Meteo) ─────────────────────────────
│  Today  │   Sun   │   Mon   │   Tue   │
│   ⛅    │   ☀️    │   🌧    │   ⛅    │
│ 15–24°  │ 13–27°  │ 14–21°  │ 16–23°  │
│  0 mm   │  0 mm   │  4 mm   │  1 mm   │
```

**Polling:** TanStack Query `refetchInterval: 30_000`. On fetch error, shows last successful data with a stale indicator — no spinner-of-death on momentary blips.

**Nav:** `/home` added as a link in the existing sidebar alongside Transactions, Categories, etc.

Types and the API hook generated via Orval from the updated OpenAPI spec (`pnpm generate`).

---

## docker-compose Changes

**New `sensor` service:**

```yaml
sensor:
  build: ./sensor
  restart: unless-stopped
  devices:
    - "/dev/i2c-1:/dev/i2c-1"
  environment:
    API_URL: http://api:5020
    POLL_INTERVAL_SECONDS: 30
    CPU_TEMP_COMPENSATION_FACTOR: 0.5
  depends_on:
    - api
```

No `privileged: true` — only the I²C device is passed through.

**`api` service new env vars:**

```yaml
Home__HungaroMetStationId: "44505"
Home__Lat: "47.4719"
Home__Lon: "19.0519"
Home__WeatherPollIntervalMinutes: "10"
```

---

## CI/CD

`.github/workflows/deploy.yml` gets one new build step: build + push `sensor` image as ARM64, same pattern as `api` and `frontend`. Deployed alongside the other services via SSH + docker-compose pull.

---

## Open Questions (resolved)

| Question | Decision |
|---|---|
| HAT model | Sense HAT |
| Integration | New `/home` page in existing Spender app |
| Storage | Existing PostgreSQL (new tables via EF Core migration) |
| Weather cache persistence | PostgreSQL `WeatherCache` table (survives restarts) |
| Home coordinates | 47.4719°N, 19.0519°E |
| Nearest station | Budapest Lágymányos, station 44505 |
| Weather display | Current + 4-day forecast |
| Python → .NET transport | HTTP POST to `/api/home/ingest` |
