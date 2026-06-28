using System.Globalization;
using System.Text.Json;
using Spender.Home.Services;

namespace Spender.Home.Parsers;

public class OpenMeteoClient
{
    private readonly HttpClient _http;

    public OpenMeteoClient(HttpClient http) => _http = http;

    public async Task<OpenMeteoDto?> FetchAsync(double lat, double lon, CancellationToken ct = default)
    {
        var url = "https://api.open-meteo.com/v1/forecast" +
                  $"?latitude={lat.ToString("F4", CultureInfo.InvariantCulture)}" +
                  $"&longitude={lon.ToString("F4", CultureInfo.InvariantCulture)}" +
                  "&current=temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m,weather_code" +
                  "&daily=temperature_2m_min,temperature_2m_max,weather_code,precipitation_sum" +
                  "&forecast_days=4&timezone=auto";

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
