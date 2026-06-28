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
        var latestSensor = await _db.Set<SensorReading>()
            .OrderByDescending(r => r.RecordedAt)
            .FirstOrDefaultAsync(ct);

        var latestHm = await _db.Set<WeatherReading>()
            .Where(r => r.Source == "HungaroMet")
            .OrderByDescending(r => r.FetchedAt)
            .FirstOrDefaultAsync(ct);

        var latestOm = await _db.Set<WeatherReading>()
            .Where(r => r.Source == "OpenMeteo")
            .OrderByDescending(r => r.FetchedAt)
            .FirstOrDefaultAsync(ct);

        SensorDto? sensor = latestSensor is null ? null : new SensorDto(
            TemperatureRaw: latestSensor.Temperature,
            TemperatureCompensated: latestSensor.TemperatureCompensated,
            Humidity: latestSensor.Humidity,
            Pressure: latestSensor.Pressure,
            DewPoint: latestSensor.DewPoint,
            FeelsLike: latestSensor.FeelsLike,
            FeelsLikeHeatIndex: (decimal)SensorMath.FeelsLikeHeatIndex(
                (double)latestSensor.TemperatureCompensated, (double)latestSensor.Humidity),
            RecordedAt: latestSensor.RecordedAt
        );

        HungaroMetDto? hm = latestHm is null ? null : new HungaroMetDto(
            Temperature: latestHm.Temperature,
            FeelsLike: latestHm.FeelsLike,
            FeelsLikeHeatIndex: (decimal)SensorMath.FeelsLikeHeatIndex(
                (double)latestHm.Temperature, (double)latestHm.Humidity),
            Humidity: latestHm.Humidity,
            Pressure: latestHm.Pressure,
            WindSpeed: latestHm.WindSpeed,
            WindDirection: latestHm.WindDirection ?? 0,
            StationName: latestHm.StationName ?? "Budapest Lágymányos",
            ObservedAt: latestHm.ObservedAt ?? latestHm.FetchedAt
        );

        OpenMeteoDto? om = null;
        if (latestOm is not null)
        {
            var forecast = string.IsNullOrEmpty(latestOm.ForecastJson)
                ? []
                : JsonSerializer.Deserialize<List<ForecastDayDto>>(latestOm.ForecastJson) ?? [];

            om = new OpenMeteoDto(
                Temperature: latestOm.Temperature,
                FeelsLike: latestOm.FeelsLike,
                Humidity: latestOm.Humidity,
                Pressure: latestOm.Pressure,
                WindSpeed: latestOm.WindSpeed,
                WeatherCode: latestOm.WeatherCode ?? 0,
                UpdatedAt: latestOm.FetchedAt,
                Forecast: forecast
            );
        }

        return new HomeDashboardResponse(sensor, hm, om);
    }
}
