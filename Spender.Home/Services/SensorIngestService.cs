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
