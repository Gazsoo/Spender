# Home Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/home` page to the existing Spender app that displays live Sense HAT sensor readings alongside HungaroMet and Open-Meteo weather data, polled every 30 seconds.

**Architecture:** A new `Spender.Home` in-process microservice (matching the existing pattern) owns sensor ingest, weather polling, and the read API. A Python `sensor/` service reads the Sense HAT and POSTs readings every 30 s. The React frontend polls `GET /api/home` and renders a three-column layout with a 4-day forecast strip.

**Tech Stack:** .NET 10 / ASP.NET Core minimal APIs, EF Core 10 + PostgreSQL, xUnit + Moq, React 19 + TanStack Query + Orval, Python 3.12 + sense-hat, Docker + docker-compose.

## Global Constraints

- .NET target: `net10.0`, `<Nullable>enable</Nullable>`, `<ImplicitUsings>enable</ImplicitUsings>`
- EF Core version: `10.0.8` (match existing packages)
- Python: 3.12-slim Docker image
- Tests: xUnit + Moq (match `Spender.Auth.Tests` pattern)
- No `privileged: true` on sensor container — pass `/dev/i2c-1` only
- `POST /api/home/ingest` must NOT have `RequireAuthorization()` — internal-only endpoint
- `GET /api/home` MUST have `RequireAuthorization()` — same as all other read endpoints
- Weather sources: HungaroMet station 44505 (Budapest Lágymányos), Open-Meteo at 47.4719°N 19.0519°E
- CPU compensation factor default: 0.5; tunable via `HomeOptions.CpuCompensationFactor`
- SensorReadings retention: 7 days (cleanup on every weather poll tick)
- WeatherCache: always exactly 2 rows ("HungaroMet" and "OpenMeteo"), upserted each poll

---

## File Map

### New files
| File | Purpose |
|---|---|
| `Spender.Shared/Models/SensorReading.cs` | EF Core entity — time-series sensor data |
| `Spender.Shared/Models/WeatherCache.cs` | EF Core entity — 2-row persistent weather cache |
| `Spender.Home/Spender.Home.csproj` | New microservice project |
| `Spender.Home/HomeOptions.cs` | Configuration POCO bound to `"Home"` appsettings section |
| `Spender.Home/Services/SensorMath.cs` | Static helpers: dew point, feels like, CPU compensation |
| `Spender.Home/Services/HomeDtos.cs` | All DTOs: `HomeDashboardResponse`, `SensorDto`, `HungaroMetDto`, `OpenMeteoDto`, `ForecastDayDto` |
| `Spender.Home/Services/ISensorIngestService.cs` | Interface |
| `Spender.Home/Services/SensorIngestService.cs` | Receives POST, derives fields, stores `SensorReading` |
| `Spender.Home/Services/IHomeDashboardService.cs` | Interface |
| `Spender.Home/Services/HomeDashboardService.cs` | Reads latest sensor + weather, composes response |
| `Spender.Home/Parsers/HungaroMetParser.cs` | Fetches + parses ISO-8859-1 CSV, extracts station 44505 |
| `Spender.Home/Parsers/OpenMeteoClient.cs` | Calls Open-Meteo API, returns current + 4-day forecast |
| `Spender.Home/Background/WeatherBackgroundService.cs` | `IHostedService` polling weather + cleanup |
| `Spender.Home.Tests/Spender.Home.Tests.csproj` | Test project |
| `Spender.Home.Tests/SensorMathTests.cs` | Unit tests for math helpers |
| `Spender.Home.Tests/HungaroMetParserTests.cs` | Unit tests for CSV parser |
| `Spender.API/Endpoints/HomeEndpoints.cs` | Maps `GET /api/home` and `POST /api/home/ingest` |
| `sensor/main.py` | Python Sense HAT reader |
| `sensor/requirements.txt` | Python deps |
| `sensor/Dockerfile` | ARM64 Python container |
| `src/pages/home/HomePage.tsx` | Layout + TanStack Query poll |
| `src/pages/home/SensorCard.tsx` | HAT column |
| `src/pages/home/HungarometCard.tsx` | HungaroMet column |
| `src/pages/home/OpenMeteoCard.tsx` | Open-Meteo column |
| `src/pages/home/ForecastStrip.tsx` | 4-day forecast bar |

### Modified files
| File | Change |
|---|---|
| `Spender.Infrastructure/Data/SpenderDbContext.cs` | Add `DbSet<SensorReading>`, `DbSet<WeatherCache>`, model config |
| `Spender.API/Spender.API.csproj` | Add `ProjectReference` to `Spender.Home` |
| `Spender.API/Extensions/ServiceCollectionExtensions.cs` | Call `AddHomeServices()` |
| `Spender.API/Extensions/WebApplicationExtensions.cs` | Call `app.MapHomeEndpoints()` |
| `Spender.API/appsettings.json` | Add `"Home"` configuration section |
| `docker-compose.yml` | Add `sensor` service; add `Home__*` env vars to `api` |
| `.env.example` | Document new env vars |
| `.github/workflows/deploy.yml` | Add sensor image build + push step |
| `frontend/spender-ui/src/App.tsx` | Add `/home` route |
| `frontend/spender-ui/src/components/layout/Shell.tsx` | Add Home nav link |

---

## Task 1: Domain models + DbContext + EF Core migration

**Files:**
- Create: `Spender.Shared/Models/SensorReading.cs`
- Create: `Spender.Shared/Models/WeatherCache.cs`
- Modify: `Spender.Infrastructure/Data/SpenderDbContext.cs`
- Generated: new migration in `Spender.Infrastructure/Migrations/`

**Interfaces:**
- Produces: `SensorReading` and `WeatherCache` entities accessible via `DbContext.Set<T>()` in all later tasks

- [ ] **Step 1: Create `SensorReading.cs`**

```csharp
// Spender.Shared/Models/SensorReading.cs
namespace Spender.Shared.Models;

public class SensorReading
{
    public int Id { get; set; }
    public DateTime RecordedAt { get; set; }
    public decimal Temperature { get; set; }
    public decimal TemperatureCompensated { get; set; }
    public decimal Humidity { get; set; }
    public decimal Pressure { get; set; }
    public decimal DewPoint { get; set; }
    public decimal FeelsLike { get; set; }
    public decimal? CpuTemperature { get; set; }
}
```

- [ ] **Step 2: Create `WeatherCache.cs`**

```csharp
// Spender.Shared/Models/WeatherCache.cs
namespace Spender.Shared.Models;

public class WeatherCache
{
    public string Source { get; set; } = string.Empty;   // PK — "HungaroMet" or "OpenMeteo"
    public DateTime FetchedAt { get; set; }
    public string Payload { get; set; } = string.Empty;  // JSON
}
```

- [ ] **Step 3: Update `SpenderDbContext.cs` — add DbSets and model config**

Open `Spender.Infrastructure/Data/SpenderDbContext.cs`. Add `DbSet` properties after the existing ones, and configure the entities inside `OnModelCreating`:

```csharp
public DbSet<SensorReading> SensorReadings { get; set; }
public DbSet<WeatherCache> WeatherCache { get; set; }
```

Inside `OnModelCreating`, after the existing entity configurations, add:

```csharp
modelBuilder.Entity<SensorReading>(entity =>
{
    entity.HasKey(e => e.Id);
    entity.Property(e => e.Temperature).HasPrecision(6, 2);
    entity.Property(e => e.TemperatureCompensated).HasPrecision(6, 2);
    entity.Property(e => e.Humidity).HasPrecision(6, 2);
    entity.Property(e => e.Pressure).HasPrecision(8, 2);
    entity.Property(e => e.DewPoint).HasPrecision(6, 2);
    entity.Property(e => e.FeelsLike).HasPrecision(6, 2);
    entity.Property(e => e.CpuTemperature).HasPrecision(6, 2);
    entity.HasIndex(e => e.RecordedAt);
});

modelBuilder.Entity<WeatherCache>(entity =>
{
    entity.HasKey(e => e.Source);
    entity.Property(e => e.Source).HasMaxLength(20);
    entity.Property(e => e.Payload).HasColumnType("text");
});
```

- [ ] **Step 4: Add new using to `SpenderDbContext.cs`**

The file already has `using Spender.Shared.Models;` so no change is needed there — the new models are in the same namespace.

- [ ] **Step 5: Create the EF Core migration**

Run from the repo root (requires a database connection string — use dev environment):

```bash
dotnet ef migrations add AddHomeTables --project Spender.Infrastructure --startup-project Spender.API
```

Expected output: `Done. To undo this action, use 'ef migrations remove'`

The migration file appears in `Spender.Infrastructure/Migrations/`. Verify it contains `CreateTable` calls for `SensorReadings` and `WeatherCache`.

- [ ] **Step 6: Verify build**

```bash
dotnet build Spender.Infrastructure
dotnet build Spender.API
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add Spender.Shared/Models/SensorReading.cs Spender.Shared/Models/WeatherCache.cs \
        Spender.Infrastructure/Data/SpenderDbContext.cs Spender.Infrastructure/Migrations/
git commit -m "feat: add SensorReading and WeatherCache DB entities with migration"
```

---

## Task 2: Spender.Home project + SensorMath + SensorIngestService + POST /api/home/ingest

**Files:**
- Create: `Spender.Home/Spender.Home.csproj`
- Create: `Spender.Home/HomeOptions.cs`
- Create: `Spender.Home/Services/SensorMath.cs`
- Create: `Spender.Home/Services/HomeDtos.cs`
- Create: `Spender.Home/Services/ISensorIngestService.cs`
- Create: `Spender.Home/Services/SensorIngestService.cs`
- Create: `Spender.Home.Tests/Spender.Home.Tests.csproj`
- Create: `Spender.Home.Tests/SensorMathTests.cs`
- Create: `Spender.API/Endpoints/HomeEndpoints.cs` (ingest endpoint only for now)

**Interfaces:**
- Consumes: `SensorReading` from Task 1
- Produces: `ISensorIngestService.IngestAsync(SensorIngestRequest, CancellationToken)`, `SensorMath.DewPoint()`, `SensorMath.FeelsLike()`, `SensorMath.Compensate()`, `HomeDtos` records used by Tasks 5 and 6

- [ ] **Step 1: Create `Spender.Home.csproj`**

```xml
<!-- Spender.Home/Spender.Home.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="10.0.8" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\Spender.Shared\Spender.Shared.csproj" />
  </ItemGroup>
</Project>
```

- [ ] **Step 2: Add to solution**

```bash
dotnet sln Spender.slnx add Spender.Home/Spender.Home.csproj
```

Expected: `Project 'Spender.Home/Spender.Home.csproj' added to the solution.`

- [ ] **Step 3: Create `HomeOptions.cs`**

```csharp
// Spender.Home/HomeOptions.cs
namespace Spender.Home;

public class HomeOptions
{
    public const string SectionName = "Home";
    public string HungaroMetStationId { get; set; } = "44505";
    public double Lat { get; set; } = 47.4719;
    public double Lon { get; set; } = 19.0519;
    public int WeatherPollIntervalMinutes { get; set; } = 10;
    public double CpuCompensationFactor { get; set; } = 0.5;
}
```

- [ ] **Step 4: Create `SensorMath.cs` (write tests first in Step 6 below — come back here)**

```csharp
// Spender.Home/Services/SensorMath.cs
namespace Spender.Home.Services;

public static class SensorMath
{
    /// <summary>Magnus formula dew point (°C).</summary>
    public static double DewPoint(double tempC, double humidityPct)
    {
        const double a = 17.625;
        const double b = 243.04;
        double gamma = a * tempC / (b + tempC) + Math.Log(humidityPct / 100.0);
        return b * gamma / (a - gamma);
    }

    /// <summary>Australian BOM apparent temperature (°C). Pass windSpeedMs = 0 for indoor.</summary>
    public static double FeelsLike(double tempC, double humidityPct, double windSpeedMs = 0)
    {
        double e = 0.6105 * Math.Exp(17.27 * tempC / (237.7 + tempC)) * (humidityPct / 100.0);
        return tempC + 0.33 * e - 0.70 * windSpeedMs - 4.0;
    }

    /// <summary>CPU heat compensation. Default factor 0.5 (tunable).</summary>
    public static double Compensate(double tempRaw, double cpuTempC, double factor = 0.5)
        => tempRaw - (cpuTempC - 25.0) * factor;
}
```

- [ ] **Step 5: Create `HomeDtos.cs`**

```csharp
// Spender.Home/Services/HomeDtos.cs
namespace Spender.Home.Services;

public record SensorIngestRequest(
    decimal TemperatureRaw,
    decimal Humidity,
    decimal Pressure,
    decimal? CpuTemperature
);

public record HomeDashboardResponse(
    SensorDto? Sensor,
    HungaroMetDto? Hungaromet,
    OpenMeteoDto? OpenMeteo
);

public record SensorDto(
    decimal TemperatureRaw,
    decimal TemperatureCompensated,
    decimal Humidity,
    decimal Pressure,
    decimal DewPoint,
    decimal FeelsLike,
    DateTime RecordedAt
);

public record HungaroMetDto(
    decimal Temperature,
    decimal FeelsLike,
    decimal Humidity,
    decimal Pressure,
    decimal WindSpeed,
    int WindDirection,
    string StationName,
    DateTime ObservedAt
);

public record OpenMeteoDto(
    decimal Temperature,
    decimal FeelsLike,
    decimal Humidity,
    decimal Pressure,
    decimal WindSpeed,
    int WeatherCode,
    DateTime UpdatedAt,
    List<ForecastDayDto> Forecast
);

public record ForecastDayDto(
    DateOnly Date,
    decimal TempMin,
    decimal TempMax,
    int WeatherCode,
    decimal PrecipitationMm
);
```

- [ ] **Step 6: Create `Spender.Home.Tests.csproj`**

```xml
<!-- Spender.Home.Tests/Spender.Home.Tests.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="coverlet.collector" Version="6.0.4" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.14.1" />
    <PackageReference Include="xunit" Version="2.9.3" />
    <PackageReference Include="xunit.runner.visualstudio" Version="3.1.4" />
  </ItemGroup>
  <ItemGroup>
    <Using Include="Xunit" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\Spender.Home\Spender.Home.csproj" />
  </ItemGroup>
</Project>
```

```bash
dotnet sln Spender.slnx add Spender.Home.Tests/Spender.Home.Tests.csproj
```

- [ ] **Step 7: Write failing tests in `SensorMathTests.cs`**

```csharp
// Spender.Home.Tests/SensorMathTests.cs
using Spender.Home.Services;

namespace Spender.Home.Tests;

public class SensorMathTests
{
    [Fact]
    public void DewPoint_Returns_CorrectValue_At22C_55Pct()
    {
        var result = SensorMath.DewPoint(22.0, 55.0);
        Assert.InRange(result, 12.0, 13.0);  // expected ~12.54°C
    }

    [Fact]
    public void DewPoint_Returns_CorrectValue_At10C_80Pct()
    {
        var result = SensorMath.DewPoint(10.0, 80.0);
        Assert.InRange(result, 6.5, 7.5);   // expected ~7.0°C
    }

    [Fact]
    public void FeelsLike_Indoor_LowerThanRawAtHighTemp()
    {
        // At 30°C / 60% humidity / 0 wind, BOM AT < raw temp (feels like is reduced by the -4 offset)
        var result = SensorMath.FeelsLike(30.0, 60.0, 0);
        Assert.InRange(result, 25.0, 30.0);
    }

    [Fact]
    public void FeelsLike_Wind_LowersApparentTemp()
    {
        var noWind = SensorMath.FeelsLike(15.0, 50.0, 0);
        var withWind = SensorMath.FeelsLike(15.0, 50.0, 5);  // 5 m/s wind
        Assert.True(withWind < noWind, "Wind should lower apparent temperature");
    }

    [Fact]
    public void Compensate_Subtracts_CpuExcess()
    {
        // cpu=52°C, raw=27°C, factor=0.5 → 27 - (52-25)*0.5 = 13.5°C
        var result = SensorMath.Compensate(27.0, 52.0, 0.5);
        Assert.Equal(13.5, result, precision: 4);
    }

    [Fact]
    public void Compensate_NoOffset_WhenCpuIs25()
    {
        var result = SensorMath.Compensate(22.0, 25.0, 0.5);
        Assert.Equal(22.0, result, precision: 4);
    }
}
```

- [ ] **Step 8: Run tests — verify they FAIL (SensorMath doesn't exist yet)**

```bash
dotnet test Spender.Home.Tests
```

Expected: build fails — `SensorMath` not found.

- [ ] **Step 9: Implement `SensorMath.cs` (already written in Step 4 — verify it compiles)**

```bash
dotnet build Spender.Home
```

Expected: success.

- [ ] **Step 10: Run tests — verify they PASS**

```bash
dotnet test Spender.Home.Tests
```

Expected: 6 tests pass.

- [ ] **Step 11: Create `ISensorIngestService.cs`**

```csharp
// Spender.Home/Services/ISensorIngestService.cs
namespace Spender.Home.Services;

public interface ISensorIngestService
{
    Task IngestAsync(SensorIngestRequest request, CancellationToken ct = default);
}
```

- [ ] **Step 12: Create `SensorIngestService.cs`**

```csharp
// Spender.Home/Services/SensorIngestService.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Spender.Shared.Models;

namespace Spender.Home.Services;

public class SensorIngestService : ISensorIngestService
{
    private readonly DbContext _db;
    private readonly double _factor;

    public SensorIngestService(DbContext db, IOptions<HomeOptions> opts)
    {
        _db = db;
        _factor = opts.Value.CpuCompensationFactor;
    }

    public async Task IngestAsync(SensorIngestRequest req, CancellationToken ct = default)
    {
        var tRaw = (double)req.TemperatureRaw;
        var humidity = (double)req.Humidity;
        var cpuTemp = (double?)req.CpuTemperature;

        var tComp = cpuTemp.HasValue
            ? SensorMath.Compensate(tRaw, cpuTemp.Value, _factor)
            : tRaw;

        _db.Set<SensorReading>().Add(new SensorReading
        {
            RecordedAt = DateTime.UtcNow,
            Temperature = req.TemperatureRaw,
            TemperatureCompensated = (decimal)tComp,
            Humidity = req.Humidity,
            Pressure = req.Pressure,
            DewPoint = (decimal)SensorMath.DewPoint(tComp, humidity),
            FeelsLike = (decimal)SensorMath.FeelsLike(tComp, humidity),
            CpuTemperature = req.CpuTemperature
        });

        await _db.SaveChangesAsync(ct);
    }
}
```

- [ ] **Step 13: Create `HomeEndpoints.cs` with the ingest endpoint (GET /api/home added in Task 6)**

```csharp
// Spender.API/Endpoints/HomeEndpoints.cs
using Spender.Home.Services;

namespace Spender.API.Endpoints;

public static class HomeEndpoints
{
    public static void MapHomeEndpoints(this WebApplication app)
    {
        // Internal-only: called by Python sensor service via docker network, not via Caddy
        app.MapPost("/api/home/ingest", async (SensorIngestRequest req, ISensorIngestService service, CancellationToken ct) =>
        {
            await service.IngestAsync(req, ct);
            return Results.NoContent();
        })
        .WithName("IngestSensorReading")
        .WithTags("Home")
        .Produces(StatusCodes.Status204NoContent);
    }
}
```

- [ ] **Step 14: Build to verify no compilation errors**

```bash
dotnet build Spender.Home
dotnet build Spender.Home.Tests
```

Expected: both succeed.

- [ ] **Step 15: Commit**

```bash
git add Spender.Home/ Spender.Home.Tests/ Spender.API/Endpoints/HomeEndpoints.cs Spender.slnx
git commit -m "feat: add Spender.Home project, SensorMath, SensorIngestService, and ingest endpoint"
```

---

## Task 3: HungaroMetParser

**Files:**
- Create: `Spender.Home/Parsers/HungaroMetParser.cs`
- Create: `Spender.Home.Tests/HungaroMetParserTests.cs`

**Interfaces:**
- Produces: `HungaroMetParser.FetchLatestAsync(stationId, ct)` → `HungaroMetDto?` — consumed by `WeatherBackgroundService` in Task 5
- Consumes: `HungaroMetDto` and `SensorMath.FeelsLike()` from Task 2

- [ ] **Step 1: Write the failing test with a fixture CSV**

The test exercises `ParseCsv` — which is the logic-heavy part. We'll make it `internal` and expose it via `InternalsVisibleTo`.

Add an attribute file to expose internals to the test project:

```csharp
// Spender.Home/AssemblyInfo.cs
using System.Runtime.CompilerServices;
[assembly: InternalsVisibleTo("Spender.Home.Tests")]
```

Now the tests:

```csharp
// Spender.Home.Tests/HungaroMetParserTests.cs
using System.Text;
using Spender.Home.Parsers;

namespace Spender.Home.Tests;

public class HungaroMetParserTests
{
    // A minimal 10-minute CSV excerpt with station 44505 and one other station.
    // Encoding is ASCII here (the real file is ISO-8859-1 but for test data ASCII suffices).
    private const string SampleCsv = """
        Time;StationNumber;StationName;Latitude;Longitude;Elevation;t;Q_t;u;Q_u;p;Q_p;fs;Q_fs;fsd;Q_fsd;EOR
        202606281200;44505;Budapest Lagymanyos;47.4747;19.0619;144.6;21.4;0;58;0;1013.2;0;3.2;0;270;0;EOR
        202606281200;99999;Other Station;47.0;19.0;100.0;20.0;0;60;0;1010.0;0;2.0;0;180;0;EOR
        """;

    [Fact]
    public void ParseCsv_ExtractsCorrectStation()
    {
        var result = HungaroMetParser.ParseCsv(SampleCsv, "44505");

        Assert.NotNull(result);
        Assert.Equal(21.4m, result.Temperature);
        Assert.Equal(58m, result.Humidity);
        Assert.Equal(1013.2m, result.Pressure);
        Assert.Equal(3.2m, result.WindSpeed);
        Assert.Equal(270, result.WindDirection);
        Assert.Contains("Lagymanyos", result.StationName);
    }

    [Fact]
    public void ParseCsv_ReturnsNull_WhenStationNotFound()
    {
        var result = HungaroMetParser.ParseCsv(SampleCsv, "00000");
        Assert.Null(result);
    }

    [Fact]
    public void ParseCsv_SkipsValue_WhenQcFlagNonZero()
    {
        var badQcCsv = """
            Time;StationNumber;StationName;Latitude;Longitude;Elevation;t;Q_t;u;Q_u;p;Q_p;fs;Q_fs;fsd;Q_fsd;EOR
            202606281200;44505;Budapest Lagymanyos;47.4747;19.0619;144.6;21.4;1;58;0;1013.2;0;3.2;0;270;0;EOR
            """;

        var result = HungaroMetParser.ParseCsv(badQcCsv, "44505");
        // t has Q_t=1 (bad QC), so Temperature should be null → returns null overall
        Assert.Null(result);
    }

    [Fact]
    public void ParseCsv_ParsesObservationTime_AsUtc()
    {
        var result = HungaroMetParser.ParseCsv(SampleCsv, "44505");

        Assert.NotNull(result);
        Assert.Equal(DateTimeKind.Utc, result.ObservedAt.Kind);
        Assert.Equal(2026, result.ObservedAt.Year);
        Assert.Equal(6, result.ObservedAt.Month);
        Assert.Equal(28, result.ObservedAt.Day);
    }
}
```

- [ ] **Step 2: Run tests — verify they FAIL**

```bash
dotnet test Spender.Home.Tests --filter "HungaroMetParserTests"
```

Expected: build fails — `HungaroMetParser` not found.

- [ ] **Step 3: Create `HungaroMetParser.cs`**

```csharp
// Spender.Home/Parsers/HungaroMetParser.cs
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Spender.Home.Services;

namespace Spender.Home.Parsers;

public class HungaroMetParser
{
    private const string BaseUrl = "https://odp.met.hu/weather/weather_reports/synoptic/hungary/10_minutes/";
    private readonly HttpClient _http;

    public HungaroMetParser(HttpClient http) => _http = http;

    public async Task<HungaroMetDto?> FetchLatestAsync(string stationId, CancellationToken ct = default)
    {
        // Get directory index and find the latest CSV filename
        var index = await _http.GetStringAsync(BaseUrl, ct);
        var matches = Regex.Matches(index, @"href=""(\d{12}\.csv)""");
        if (matches.Count == 0) return null;

        var latest = matches.Cast<Match>()
            .Select(m => m.Groups[1].Value)
            .OrderDescending()
            .First();

        var bytes = await _http.GetByteArrayAsync(BaseUrl + latest, ct);
        var csv = Encoding.Latin1.GetString(bytes);

        return ParseCsv(csv, stationId);
    }

    internal static HungaroMetDto? ParseCsv(string csv, string stationId)
    {
        var lines = csv.ReplaceLineEndings("\n").Split('\n', StringSplitOptions.RemoveEmptyEntries);

        // First non-comment, non-empty line is the header
        var headerLine = lines.FirstOrDefault(l => !l.TrimStart().StartsWith('#'));
        if (headerLine is null) return null;

        var headers = headerLine.Split(';').Select(h => h.Trim()).ToArray();
        var stationIdx = Array.IndexOf(headers, "StationNumber");
        if (stationIdx < 0) return null;

        foreach (var line in lines.Skip(1))
        {
            if (string.IsNullOrWhiteSpace(line) || line.TrimStart().StartsWith('#')) continue;
            var fields = line.Split(';').Select(f => f.Trim()).ToArray();
            if (fields.Length <= stationIdx) continue;
            if (fields[stationIdx] != stationId) continue;

            return ExtractReading(headers, fields);
        }

        return null;
    }

    private static double? GetField(string[] headers, string[] fields, string name)
    {
        var idx = Array.IndexOf(headers, name);
        if (idx < 0 || idx >= fields.Length) return null;

        // Check quality-control flag (Q_<name>) — 0 = good, non-zero = reject
        var qIdx = Array.IndexOf(headers, "Q_" + name);
        if (qIdx >= 0 && qIdx < fields.Length &&
            int.TryParse(fields[qIdx], out var qc) && qc != 0)
            return null;

        return double.TryParse(fields[idx], NumberStyles.Any, CultureInfo.InvariantCulture, out var v)
            ? v : null;
    }

    private static HungaroMetDto? ExtractReading(string[] headers, string[] fields)
    {
        var t = GetField(headers, fields, "t");
        var u = GetField(headers, fields, "u");
        var p = GetField(headers, fields, "p");
        var fs = GetField(headers, fields, "fs");
        var fsd = GetField(headers, fields, "fsd");

        // Temperature, humidity, and pressure are required
        if (t is null || u is null || p is null) return null;

        var windSpeedMs = fs ?? 0.0;
        var feelsLike = SensorMath.FeelsLike(t.Value, u.Value, windSpeedMs);

        var timeIdx = Array.IndexOf(headers, "Time");
        DateTime observedAt = DateTime.UtcNow;
        if (timeIdx >= 0 && timeIdx < fields.Length)
        {
            DateTime.TryParseExact(fields[timeIdx], "yyyyMMddHHmm",
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out observedAt);
        }

        var nameIdx = Array.IndexOf(headers, "StationName");
        var stationName = nameIdx >= 0 && nameIdx < fields.Length
            ? fields[nameIdx]
            : "Budapest Lágymányos";

        return new HungaroMetDto(
            Temperature: (decimal)t.Value,
            FeelsLike: (decimal)feelsLike,
            Humidity: (decimal)u.Value,
            Pressure: (decimal)p.Value,
            WindSpeed: (decimal)(fs ?? 0),
            WindDirection: (int)(fsd ?? 0),
            StationName: stationName,
            ObservedAt: observedAt
        );
    }
}
```

- [ ] **Step 4: Run tests — verify they PASS**

```bash
dotnet test Spender.Home.Tests --filter "HungaroMetParserTests"
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add Spender.Home/Parsers/HungaroMetParser.cs Spender.Home/AssemblyInfo.cs \
        Spender.Home/Spender.Home.csproj \
        Spender.Home.Tests/HungaroMetParserTests.cs
git commit -m "feat: add HungaroMetParser with CSV parsing and QC-flag filtering"
```

---

## Task 4: OpenMeteoClient

**Files:**
- Create: `Spender.Home/Parsers/OpenMeteoClient.cs`

**Interfaces:**
- Produces: `OpenMeteoClient.FetchAsync(lat, lon, ct)` → `OpenMeteoDto?` — consumed by `WeatherBackgroundService` in Task 5
- Consumes: `OpenMeteoDto`, `ForecastDayDto` from Task 2

- [ ] **Step 1: Create `OpenMeteoClient.cs`**

The Open-Meteo API returns current conditions and daily forecast in a single call. No API key needed.

```csharp
// Spender.Home/Parsers/OpenMeteoClient.cs
using System.Text.Json;
using Spender.Home.Services;

namespace Spender.Home.Parsers;

public class OpenMeteoClient
{
    private readonly HttpClient _http;

    public OpenMeteoClient(HttpClient http) => _http = http;

    public async Task<OpenMeteoDto?> FetchAsync(double lat, double lon, CancellationToken ct = default)
    {
        var url = $"https://api.open-meteo.com/v1/forecast" +
                  $"?latitude={lat.ToString("F4", System.Globalization.CultureInfo.InvariantCulture)}" +
                  $"&longitude={lon.ToString("F4", System.Globalization.CultureInfo.InvariantCulture)}" +
                  $"&current=temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m,weather_code" +
                  $"&daily=temperature_2m_min,temperature_2m_max,weather_code,precipitation_sum" +
                  $"&forecast_days=4&timezone=auto";

        var json = await _http.GetStringAsync(url, ct);
        using var doc = JsonDocument.Parse(json);

        if (!doc.RootElement.TryGetProperty("current", out var current) ||
            !doc.RootElement.TryGetProperty("daily", out var daily))
            return null;

        var times = daily.GetProperty("time").EnumerateArray().Select(e => e.GetString()!).ToArray();
        var tMins = daily.GetProperty("temperature_2m_min").EnumerateArray().Select(e => e.GetDecimal()).ToArray();
        var tMaxs = daily.GetProperty("temperature_2m_max").EnumerateArray().Select(e => e.GetDecimal()).ToArray();
        var wCodes = daily.GetProperty("weather_code").EnumerateArray().Select(e => e.GetInt32()).ToArray();
        var precips = daily.GetProperty("precipitation_sum").EnumerateArray().Select(e => e.GetDecimal()).ToArray();

        var forecast = times.Select((t, i) => new ForecastDayDto(
            Date: DateOnly.Parse(t),
            TempMin: tMins[i],
            TempMax: tMaxs[i],
            WeatherCode: wCodes[i],
            PrecipitationMm: precips[i]
        )).ToList();

        return new OpenMeteoDto(
            Temperature: current.GetProperty("temperature_2m").GetDecimal(),
            FeelsLike: current.GetProperty("apparent_temperature").GetDecimal(),
            Humidity: current.GetProperty("relative_humidity_2m").GetDecimal(),
            Pressure: current.GetProperty("surface_pressure").GetDecimal(),
            WindSpeed: current.GetProperty("wind_speed_10m").GetDecimal(),
            WeatherCode: current.GetProperty("weather_code").GetInt32(),
            UpdatedAt: DateTime.UtcNow,
            Forecast: forecast
        );
    }
}
```

- [ ] **Step 2: Build to verify**

```bash
dotnet build Spender.Home
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add Spender.Home/Parsers/OpenMeteoClient.cs
git commit -m "feat: add OpenMeteoClient for current conditions and 4-day forecast"
```

---

## Task 5: WeatherBackgroundService

**Files:**
- Create: `Spender.Home/Background/WeatherBackgroundService.cs`

**Interfaces:**
- Consumes: `HungaroMetParser.FetchLatestAsync()` (Task 3), `OpenMeteoClient.FetchAsync()` (Task 4), `HomeOptions` (Task 2), `WeatherCache` entity (Task 1), `SensorReading` entity (Task 1)
- Produces: Populates `WeatherCache` rows; consumed by `HomeDashboardService` in Task 6

- [ ] **Step 1: Create `WeatherBackgroundService.cs`**

```csharp
// Spender.Home/Background/WeatherBackgroundService.cs
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Spender.Home.Parsers;
using Spender.Home.Services;
using Spender.Shared.Models;

namespace Spender.Home.Background;

public class WeatherBackgroundService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly TimeSpan _interval;
    private readonly ILogger<WeatherBackgroundService> _logger;

    public WeatherBackgroundService(
        IServiceProvider services,
        IOptions<HomeOptions> opts,
        ILogger<WeatherBackgroundService> logger)
    {
        _services = services;
        _interval = TimeSpan.FromMinutes(opts.Value.WeatherPollIntervalMinutes);
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Short startup delay so the API is fully ready before the first poll
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PollAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Weather poll failed — will retry in {Interval}", _interval);
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }

    private async Task PollAsync(CancellationToken ct)
    {
        await using var scope = _services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<DbContext>();
        var opts = scope.ServiceProvider.GetRequiredService<IOptions<HomeOptions>>().Value;
        var hungaroMet = scope.ServiceProvider.GetRequiredService<HungaroMetParser>();
        var openMeteo = scope.ServiceProvider.GetRequiredService<OpenMeteoClient>();

        // Fetch both sources concurrently
        var hmTask = hungaroMet.FetchLatestAsync(opts.HungaroMetStationId, ct);
        var omTask = openMeteo.FetchAsync(opts.Lat, opts.Lon, ct);
        await Task.WhenAll(hmTask, omTask);

        if (hmTask.Result is { } hm)
        {
            await UpsertAsync(db, "HungaroMet", hm, ct);
            _logger.LogInformation("HungaroMet: {Temp}°C obs {At}", hm.Temperature, hm.ObservedAt);
        }

        if (omTask.Result is { } om)
        {
            await UpsertAsync(db, "OpenMeteo", om, ct);
            _logger.LogInformation("Open-Meteo: {Temp}°C updated {At}", om.Temperature, om.UpdatedAt);
        }

        // Cleanup sensor readings older than 7 days
        var cutoff = DateTime.UtcNow.AddDays(-7);
        var deleted = await db.Set<SensorReading>()
            .Where(r => r.RecordedAt < cutoff)
            .ExecuteDeleteAsync(ct);

        if (deleted > 0)
            _logger.LogInformation("Pruned {Count} old sensor readings", deleted);
    }

    private static async Task UpsertAsync(DbContext db, string source, object data, CancellationToken ct)
    {
        var payload = JsonSerializer.Serialize(data);
        var existing = await db.Set<WeatherCache>().FindAsync([source], ct);
        if (existing is null)
            db.Set<WeatherCache>().Add(new WeatherCache { Source = source, FetchedAt = DateTime.UtcNow, Payload = payload });
        else
        {
            existing.FetchedAt = DateTime.UtcNow;
            existing.Payload = payload;
        }
        await db.SaveChangesAsync(ct);
    }
}
```

- [ ] **Step 2: Build**

```bash
dotnet build Spender.Home
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add Spender.Home/Background/WeatherBackgroundService.cs
git commit -m "feat: add WeatherBackgroundService polling HungaroMet and Open-Meteo every 10 min"
```

---

## Task 6: HomeDashboardService + GET /api/home endpoint

**Files:**
- Create: `Spender.Home/Services/IHomeDashboardService.cs`
- Create: `Spender.Home/Services/HomeDashboardService.cs`
- Modify: `Spender.API/Endpoints/HomeEndpoints.cs` (add GET endpoint)

**Interfaces:**
- Consumes: `SensorReading` (Task 1), `WeatherCache` (Task 1), `HungaroMetDto`, `OpenMeteoDto`, `HomeDashboardResponse` (Task 2)
- Produces: `GET /api/home` → `HomeDashboardResponse`

- [ ] **Step 1: Create `IHomeDashboardService.cs`**

```csharp
// Spender.Home/Services/IHomeDashboardService.cs
namespace Spender.Home.Services;

public interface IHomeDashboardService
{
    Task<HomeDashboardResponse> GetDashboardAsync(CancellationToken ct = default);
}
```

- [ ] **Step 2: Create `HomeDashboardService.cs`**

```csharp
// Spender.Home/Services/HomeDashboardService.cs
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Spender.Shared.Models;

namespace Spender.Home.Services;

public class HomeDashboardService : IHomeDashboardService
{
    private readonly DbContext _db;

    public HomeDashboardService(DbContext db) => _db = db;

    public async Task<HomeDashboardResponse> GetDashboardAsync(CancellationToken ct = default)
    {
        var latest = await _db.Set<SensorReading>()
            .OrderByDescending(r => r.RecordedAt)
            .FirstOrDefaultAsync(ct);

        var caches = await _db.Set<WeatherCache>().ToListAsync(ct);

        SensorDto? sensor = latest is null ? null : new SensorDto(
            TemperatureRaw: latest.Temperature,
            TemperatureCompensated: latest.TemperatureCompensated,
            Humidity: latest.Humidity,
            Pressure: latest.Pressure,
            DewPoint: latest.DewPoint,
            FeelsLike: latest.FeelsLike,
            RecordedAt: latest.RecordedAt
        );

        HungaroMetDto? hm = null;
        var hmCache = caches.FirstOrDefault(c => c.Source == "HungaroMet");
        if (hmCache is not null)
            hm = JsonSerializer.Deserialize<HungaroMetDto>(hmCache.Payload);

        OpenMeteoDto? om = null;
        var omCache = caches.FirstOrDefault(c => c.Source == "OpenMeteo");
        if (omCache is not null)
            om = JsonSerializer.Deserialize<OpenMeteoDto>(omCache.Payload);

        return new HomeDashboardResponse(sensor, hm, om);
    }
}
```

- [ ] **Step 3: Add GET /api/home to `HomeEndpoints.cs`**

Open `Spender.API/Endpoints/HomeEndpoints.cs` and add the GET endpoint inside `MapHomeEndpoints`:

```csharp
// Add this BEFORE the MapPost call:
app.MapGet("/api/home", async (IHomeDashboardService service, CancellationToken ct) =>
{
    var dashboard = await service.GetDashboardAsync(ct);
    return Results.Ok(dashboard);
})
.WithName("GetHome")
.WithTags("Home")
.RequireAuthorization()
.Produces<HomeDashboardResponse>();
```

The full `HomeEndpoints.cs` after the change:

```csharp
// Spender.API/Endpoints/HomeEndpoints.cs
using Spender.Home.Services;

namespace Spender.API.Endpoints;

public static class HomeEndpoints
{
    public static void MapHomeEndpoints(this WebApplication app)
    {
        app.MapGet("/api/home", async (IHomeDashboardService service, CancellationToken ct) =>
        {
            var dashboard = await service.GetDashboardAsync(ct);
            return Results.Ok(dashboard);
        })
        .WithName("GetHome")
        .WithTags("Home")
        .RequireAuthorization()
        .Produces<HomeDashboardResponse>();

        // Internal-only: called by Python sensor service via docker network, not via Caddy
        app.MapPost("/api/home/ingest", async (SensorIngestRequest req, ISensorIngestService service, CancellationToken ct) =>
        {
            await service.IngestAsync(req, ct);
            return Results.NoContent();
        })
        .WithName("IngestSensorReading")
        .WithTags("Home")
        .Produces(StatusCodes.Status204NoContent);
    }
}
```

- [ ] **Step 4: Build**

```bash
dotnet build Spender.Home
```

Expected: success.

- [ ] **Step 5: Commit**

```bash
git add Spender.Home/Services/IHomeDashboardService.cs \
        Spender.Home/Services/HomeDashboardService.cs \
        Spender.API/Endpoints/HomeEndpoints.cs
git commit -m "feat: add HomeDashboardService and GET /api/home endpoint"
```

---

## Task 7: Register Spender.Home in Spender.API — wire everything up

**Files:**
- Modify: `Spender.API/Spender.API.csproj`
- Modify: `Spender.API/Extensions/ServiceCollectionExtensions.cs`
- Modify: `Spender.API/Extensions/WebApplicationExtensions.cs`
- Modify: `Spender.API/appsettings.json`

**Interfaces:**
- Consumes: All services from Tasks 2–6
- Produces: A working `dotnet run` with `GET /api/home` and `POST /api/home/ingest` responding

- [ ] **Step 1: Add `ProjectReference` to `Spender.API.csproj`**

Open `Spender.API/Spender.API.csproj`. Inside the first `<ItemGroup>` that has project references, add:

```xml
<ProjectReference Include="..\Spender.Home\Spender.Home.csproj" />
```

- [ ] **Step 2: Add `AddHomeServices()` to `ServiceCollectionExtensions.cs`**

Open `Spender.API/Extensions/ServiceCollectionExtensions.cs`. Add these `using` statements at the top:

```csharp
using Spender.Home;
using Spender.Home.Background;
using Spender.Home.Parsers;
using Spender.Home.Services;
```

At the end of `AddSpenderServices`, before `return services;`, add:

```csharp
// Home dashboard — sensor ingest + weather
services.Configure<HomeOptions>(configuration.GetSection(HomeOptions.SectionName));
services.AddScoped<ISensorIngestService, SensorIngestService>();
services.AddScoped<IHomeDashboardService, HomeDashboardService>();
services.AddHttpClient<HungaroMetParser>();
services.AddHttpClient<OpenMeteoClient>();
services.AddHostedService<WeatherBackgroundService>();
```

- [ ] **Step 3: Add `MapHomeEndpoints()` to `WebApplicationExtensions.cs`**

Open `Spender.API/Extensions/WebApplicationExtensions.cs`. Add `using Spender.API.Endpoints;` if not already present (it is). After `app.MapPeopleEndpoints();`, add:

```csharp
app.MapHomeEndpoints();
```

- [ ] **Step 4: Add `Home` section to `appsettings.json`**

Open `Spender.API/appsettings.json`. After the existing `"AllowedHosts"` entry, add:

```json
"Home": {
  "HungaroMetStationId": "44505",
  "Lat": 47.4719,
  "Lon": 19.0519,
  "WeatherPollIntervalMinutes": 10,
  "CpuCompensationFactor": 0.5
}
```

- [ ] **Step 5: Full build — verify everything compiles**

```bash
dotnet build
```

Expected: no errors across all projects.

- [ ] **Step 6: Run API and smoke-test endpoints**

```bash
dotnet run --project Spender.API
```

In another terminal:

```bash
# Test ingest (no auth required)
curl -s -X POST http://localhost:5020/api/home/ingest \
  -H "Content-Type: application/json" \
  -d '{"temperatureRaw":24.1,"humidity":55.0,"pressure":1013.2,"cpuTemperature":52.0}'
# Expected: 204 No Content

# Test GET (401 Unauthorized without a session cookie — this is correct)
curl -s http://localhost:5020/api/home
# Expected: 401
```

- [ ] **Step 7: Regenerate Orval types (so the frontend can use the new endpoints)**

```bash
cd frontend/spender-ui
pnpm generate
```

Expected: `src/api/home/home.ts` and related type files generated.

- [ ] **Step 8: Commit**

```bash
git add Spender.API/Spender.API.csproj \
        Spender.API/Extensions/ServiceCollectionExtensions.cs \
        Spender.API/Extensions/WebApplicationExtensions.cs \
        Spender.API/appsettings.json \
        frontend/spender-ui/src/api/
git commit -m "feat: register Spender.Home in API, wire endpoints, regenerate Orval types"
```

---

## Task 8: Python sensor service

**Files:**
- Create: `sensor/requirements.txt`
- Create: `sensor/main.py`
- Create: `sensor/Dockerfile`

**Interfaces:**
- Produces: Docker image that POSTs to `/api/home/ingest` every 30 s

- [ ] **Step 1: Create `sensor/requirements.txt`**

```
sense-hat==2.6.0
requests==2.32.4
```

- [ ] **Step 2: Create `sensor/main.py`**

```python
#!/usr/bin/env python3
"""Sense HAT reader — samples sensors every POLL_INTERVAL_SECONDS and POSTs to the API."""
import logging
import math
import os
import subprocess
import time

import requests
from sense_hat import SenseHat

API_URL = os.getenv("API_URL", "http://api:5020")
INTERVAL = int(os.getenv("POLL_INTERVAL_SECONDS", "30"))
COMP_FACTOR = float(os.getenv("CPU_TEMP_COMPENSATION_FACTOR", "0.5"))
INGEST_URL = f"{API_URL}/api/home/ingest"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger(__name__)

sense = SenseHat()
sense.clear()


def get_cpu_temp() -> float | None:
    """Read CPU temperature via vcgencmd. Returns None on failure."""
    try:
        result = subprocess.run(
            ["vcgencmd", "measure_temp"],
            capture_output=True,
            text=True,
            timeout=2,
        )
        # Output format: "temp=52.0'C\n"
        return float(result.stdout.split("=")[1].split("'")[0])
    except Exception as exc:
        log.warning("Could not read CPU temp: %s", exc)
        return None


def post_reading(temp_raw: float, humidity: float, pressure: float, cpu: float | None) -> None:
    payload = {
        "temperatureRaw": round(temp_raw, 2),
        "humidity": round(humidity, 2),
        "pressure": round(pressure, 2),
        "cpuTemperature": round(cpu, 2) if cpu is not None else None,
    }
    resp = requests.post(INGEST_URL, json=payload, timeout=10)
    resp.raise_for_status()


def main() -> None:
    log.info("Sensor service starting. API=%s interval=%ss", API_URL, INTERVAL)

    # Brief startup delay so the API container is ready to accept requests
    time.sleep(5)

    while True:
        try:
            temp_raw = sense.get_temperature()
            humidity = sense.get_humidity()
            pressure = sense.get_pressure()
            cpu = get_cpu_temp()
            post_reading(temp_raw, humidity, pressure, cpu)
            log.info(
                "Posted: raw=%.2f°C  hum=%.1f%%  pres=%.1f hPa  cpu=%s°C",
                temp_raw,
                humidity,
                pressure,
                f"{cpu:.1f}" if cpu else "n/a",
            )
        except requests.HTTPError as exc:
            log.error("API rejected reading: %s", exc)
        except Exception as exc:
            log.error("Read/post failed: %s", exc)

        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Create `sensor/Dockerfile`**

```dockerfile
FROM python:3.12-slim

# libraspberrypi-bin provides vcgencmd; i2c-tools lets us verify bus access
RUN apt-get update && apt-get install -y --no-install-recommends \
    libraspberrypi-bin \
    i2c-tools \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

CMD ["python", "main.py"]
```

- [ ] **Step 4: Verify the image builds (on an x86 dev machine, sense-hat will install but won't run — that's expected)**

```bash
docker build -t spender-sensor-test sensor/
```

Expected: image builds successfully. The `sense-hat` package installs cleanly even without the HAT present.

- [ ] **Step 5: Commit**

```bash
git add sensor/
git commit -m "feat: add Python Sense HAT sensor service (main.py + Dockerfile)"
```

---

## Task 9: docker-compose + CI/CD + env

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: Full stack deployable via `docker compose up`; sensor image built and pushed by CI

- [ ] **Step 1: Update `docker-compose.yml` — add sensor service + api env vars**

Open `docker-compose.yml`. Add the `sensor` service after `frontend`:

```yaml
  sensor:
    image: ${SENSOR_IMAGE}
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

In the `api` service `environment` block, add:

```yaml
      Home__HungaroMetStationId: "44505"
      Home__Lat: "47.4719"
      Home__Lon: "19.0519"
      Home__WeatherPollIntervalMinutes: "10"
      Home__CpuCompensationFactor: "0.5"
```

- [ ] **Step 2: Update `.env.example`**

Add after the existing `FRONTEND_IMAGE` line:

```bash
SENSOR_IMAGE=ghcr.io/yourusername/spender-sensor:latest
```

- [ ] **Step 3: Update `.github/workflows/deploy.yml` — add sensor image build**

Add the following step after the "Build and push API image" step and before the .NET SDK setup:

```yaml
      - name: Build and push Sensor image
        uses: docker/build-push-action@v5
        with:
          context: ./sensor
          file: ./sensor/Dockerfile
          platforms: linux/arm64
          push: true
          tags: ghcr.io/${{ vars.OWNER }}/spender-sensor:latest
```

In the "Deploy to Pi" step, add `SENSOR_IMAGE` to the `envs:` list and the `env:` block:

In `envs:`: add `SENSOR_IMAGE` to the comma-separated list.

In `env:`:
```yaml
          SENSOR_IMAGE: ghcr.io/${{ vars.OWNER }}/spender-sensor:latest
```

- [ ] **Step 4: Verify docker-compose is valid**

```bash
docker compose config
```

Expected: valid YAML printed with no errors. (The `sensor` image won't exist yet locally — that's fine.)

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.example .github/workflows/deploy.yml
git commit -m "feat: add sensor service to docker-compose and CI/CD pipeline"
```

---

## Task 10: Frontend /home page

**Files:**
- Create: `frontend/spender-ui/src/pages/home/HomePage.tsx`
- Create: `frontend/spender-ui/src/pages/home/SensorCard.tsx`
- Create: `frontend/spender-ui/src/pages/home/HungarometCard.tsx`
- Create: `frontend/spender-ui/src/pages/home/OpenMeteoCard.tsx`
- Create: `frontend/spender-ui/src/pages/home/ForecastStrip.tsx`
- Modify: `frontend/spender-ui/src/App.tsx`
- Modify: `frontend/spender-ui/src/components/layout/Shell.tsx`

**Interfaces:**
- Consumes: Orval-generated `getHome()` and types from `src/api/home/home.ts` (generated in Task 7)
- Produces: `/home` page accessible in the browser

- [ ] **Step 1: Create `SensorCard.tsx`**

```tsx
// frontend/spender-ui/src/pages/home/SensorCard.tsx
import type { SensorDto } from '../../api/model';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default function SensorCard({ sensor }: { sensor: SensorDto | null | undefined }) {
  if (!sensor) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
        <p className="font-display font-bold text-sm text-gray-900 tracking-tight mb-0.5">In-room (HAT)</p>
        <p className="text-xs text-gray-400 mb-4">Budapest XI</p>
        <p className="text-sm text-gray-400">No readings yet.</p>
      </div>
    );
  }

  const updatedAt = new Date(sensor.recordedAt).toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
      <p className="font-display font-bold text-sm text-gray-900 tracking-tight mb-0.5">In-room (HAT)</p>
      <p className="text-xs text-gray-400 mb-4">Budapest XI</p>
      <Row label="Temperature" value={`${Number(sensor.temperatureCompensated).toFixed(1)}°C`} />
      <Row label="Feels like" value={`${Number(sensor.feelsLike).toFixed(1)}°C`} />
      <Row label="Humidity" value={`${Number(sensor.humidity).toFixed(0)}%`} />
      <Row label="Pressure" value={`${Number(sensor.pressure).toFixed(0)} hPa`} />
      <Row label="Dew point" value={`${Number(sensor.dewPoint).toFixed(1)}°C`} />
      <p className="text-xs text-gray-400 mt-auto pt-3">Updated {updatedAt}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `HungarometCard.tsx`**

```tsx
// frontend/spender-ui/src/pages/home/HungarometCard.tsx
import type { HungaroMetDto } from '../../api/model';

const WIND_DIRS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

function windDir(deg: number): string {
  return WIND_DIRS[Math.round(deg / 22.5) % 16];
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default function HungarometCard({ data }: { data: HungaroMetDto | null | undefined }) {
  if (!data) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
        <p className="font-display font-bold text-sm text-gray-900 tracking-tight mb-0.5">HungaroMet</p>
        <p className="text-xs text-gray-400 mb-4">Lágymányos</p>
        <p className="text-sm text-gray-400">No data yet.</p>
      </div>
    );
  }

  const obsAt = new Date(data.observedAt).toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
      <p className="font-display font-bold text-sm text-gray-900 tracking-tight mb-0.5">HungaroMet</p>
      <p className="text-xs text-gray-400 mb-4">Lágymányos</p>
      <Row label="Temperature" value={`${Number(data.temperature).toFixed(1)}°C`} />
      <Row label="Feels like" value={`${Number(data.feelsLike).toFixed(1)}°C`} />
      <Row label="Humidity" value={`${Number(data.humidity).toFixed(0)}%`} />
      <Row label="Pressure" value={`${Number(data.pressure).toFixed(0)} hPa`} />
      <Row label="Wind" value={`${Number(data.windSpeed).toFixed(1)} m/s ${windDir(data.windDirection)}`} />
      <p className="text-xs text-gray-400 mt-auto pt-3">Obs. {obsAt}</p>
    </div>
  );
}
```

- [ ] **Step 3: Create `OpenMeteoCard.tsx`**

```tsx
// frontend/spender-ui/src/pages/home/OpenMeteoCard.tsx
import type { OpenMeteoDto } from '../../api/model';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default function OpenMeteoCard({ data }: { data: OpenMeteoDto | null | undefined }) {
  if (!data) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
        <p className="font-display font-bold text-sm text-gray-900 tracking-tight mb-0.5">Open-Meteo</p>
        <p className="text-xs text-gray-400 mb-4">model · exact location</p>
        <p className="text-sm text-gray-400">No data yet.</p>
      </div>
    );
  }

  const updatedAt = new Date(data.updatedAt).toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
      <p className="font-display font-bold text-sm text-gray-900 tracking-tight mb-0.5">Open-Meteo</p>
      <p className="text-xs text-gray-400 mb-4">model · exact location</p>
      <Row label="Temperature" value={`${Number(data.temperature).toFixed(1)}°C`} />
      <Row label="Feels like" value={`${Number(data.feelsLike).toFixed(1)}°C`} />
      <Row label="Humidity" value={`${Number(data.humidity).toFixed(0)}%`} />
      <Row label="Pressure" value={`${Number(data.pressure).toFixed(0)} hPa`} />
      <Row label="Wind" value={`${Number(data.windSpeed).toFixed(1)} km/h`} />
      <p className="text-xs text-gray-400 mt-auto pt-3">Updated {updatedAt}</p>
    </div>
  );
}
```

- [ ] **Step 4: Create `ForecastStrip.tsx`**

```tsx
// frontend/spender-ui/src/pages/home/ForecastStrip.tsx
import type { ForecastDayDto } from '../../api/model';

// WMO weather interpretation codes → emoji
function weatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code === 3) return '☁️';
  if (code <= 49) return '🌫️';
  if (code <= 59) return '🌦️';
  if (code <= 69) return '🌧️';
  if (code <= 79) return '❄️';
  if (code <= 84) return '🌦️';
  return '⛈️';
}

export default function ForecastStrip({ forecast }: { forecast: ForecastDayDto[] | null | undefined }) {
  if (!forecast || forecast.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <p className="font-display font-bold text-sm text-gray-900 tracking-tight mb-4">4-day forecast</p>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${forecast.length}, 1fr)` }}
      >
        {forecast.map((day) => {
          const label = new Date(day.date).toLocaleDateString('hu-HU', { weekday: 'short' });
          return (
            <div key={day.date} className="flex flex-col items-center gap-1.5">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
              <span className="text-2xl leading-none">{weatherEmoji(day.weatherCode)}</span>
              <span className="text-sm font-medium text-gray-900 tabular-nums">
                {Number(day.tempMin).toFixed(0)}–{Number(day.tempMax).toFixed(0)}°
              </span>
              <span className="text-xs text-gray-400 tabular-nums">
                {Number(day.precipitationMm).toFixed(0)} mm
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `HomePage.tsx`**

```tsx
// frontend/spender-ui/src/pages/home/HomePage.tsx
import { useQuery } from '@tanstack/react-query';
import { getHome } from '../../api/home/home';
import SensorCard from './SensorCard';
import HungarometCard from './HungarometCard';
import OpenMeteoCard from './OpenMeteoCard';
import ForecastStrip from './ForecastStrip';

export default function HomePage() {
  const { data, isError } = useQuery({
    queryKey: ['home'],
    queryFn: () => getHome(),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  return (
    <div className="flex flex-col gap-4">
      {isError && (
        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          Connection lost — showing last known data.
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <SensorCard sensor={data?.sensor} />
        <HungarometCard data={data?.hungaromet} />
        <OpenMeteoCard data={data?.openMeteo} />
      </div>

      <ForecastStrip forecast={data?.openMeteo?.forecast} />
    </div>
  );
}
```

- [ ] **Step 6: Add `/home` route to `App.tsx`**

Open `frontend/spender-ui/src/App.tsx`. Add import at the top:

```tsx
import HomePage from './pages/home/HomePage';
```

Inside the `<Route element={<Shell />}>` block, add after the `/debt` route:

```tsx
<Route path="/home" element={<HomePage />} />
```

- [ ] **Step 7: Add Home nav link to `Shell.tsx`**

Open `frontend/spender-ui/src/components/layout/Shell.tsx`. Add `Home` import to the existing lucide import line:

```tsx
import { LayoutDashboard, ArrowLeftRight, Tag, BarChart2, Scale, Home, LogOut } from 'lucide-react';
```

Add a new entry to the `nav` array at the beginning (before Dashboard, or at end — your choice):

```tsx
{ to: '/home',         label: 'Home',         icon: Home            },
```

- [ ] **Step 8: Type-check**

```bash
cd frontend/spender-ui
pnpm build
```

Expected: TypeScript compilation succeeds, no type errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/spender-ui/src/pages/home/ \
        frontend/spender-ui/src/App.tsx \
        frontend/spender-ui/src/components/layout/Shell.tsx
git commit -m "feat: add /home page with sensor, HungaroMet, and Open-Meteo weather columns"
```

---

## Self-Review Checklist (for executor)

After completing all tasks, verify:

- [ ] `GET /api/home` returns 401 without auth cookie, 200 with it
- [ ] `POST /api/home/ingest` returns 204 without auth (curl test from Task 7 Step 6)
- [ ] `WeatherCache` table has 2 rows after first background service poll
- [ ] `SensorReadings` table accumulates rows every 30 s when sensor service is running
- [ ] All 6 `SensorMathTests` pass
- [ ] All 4 `HungaroMetParserTests` pass
- [ ] `/home` page renders all three cards without errors (null state before data arrives is fine)
- [ ] `/home` nav link is visible and active-highlighted correctly
- [ ] No TypeScript errors (`pnpm build` clean)
