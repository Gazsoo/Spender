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

        var hmTask = hungaroMet.FetchLatestAsync(opts.HungaroMetStationId, ct);
        var omTask = openMeteo.FetchAsync(opts.Lat, opts.Lon, ct);
        await Task.WhenAll(hmTask, omTask);

        var now = DateTime.UtcNow;

        if (hmTask.Result is { } hm)
        {
            db.Set<WeatherReading>().Add(new WeatherReading
            {
                Source = "HungaroMet",
                FetchedAt = now,
                Temperature = hm.Temperature,
                FeelsLike = hm.FeelsLike,
                Humidity = hm.Humidity,
                Pressure = hm.Pressure,
                WindSpeed = hm.WindSpeed,
                WindDirection = hm.WindDirection,
                StationName = hm.StationName,
                ObservedAt = hm.ObservedAt,
            });
            _logger.LogInformation("HungaroMet: {Temp}°C obs {At}", hm.Temperature, hm.ObservedAt);
        }

        if (omTask.Result is { } om)
        {
            db.Set<WeatherReading>().Add(new WeatherReading
            {
                Source = "OpenMeteo",
                FetchedAt = now,
                Temperature = om.Temperature,
                FeelsLike = om.FeelsLike,
                Humidity = om.Humidity,
                Pressure = om.Pressure,
                WindSpeed = om.WindSpeed,
                WeatherCode = om.WeatherCode,
                ForecastJson = JsonSerializer.Serialize(om.Forecast),
            });
            _logger.LogInformation("Open-Meteo: {Temp}°C updated {At}", om.Temperature, om.UpdatedAt);
        }

        await db.SaveChangesAsync(ct);

        var cutoff = now.AddDays(-7);
        var deletedSensor = await db.Set<SensorReading>()
            .Where(r => r.RecordedAt < cutoff)
            .ExecuteDeleteAsync(ct);
        var deletedWeather = await db.Set<WeatherReading>()
            .Where(r => r.FetchedAt < cutoff)
            .ExecuteDeleteAsync(ct);

        if (deletedSensor + deletedWeather > 0)
            _logger.LogInformation("Pruned {S} sensor and {W} weather readings older than 7 days",
                deletedSensor, deletedWeather);
    }
}
