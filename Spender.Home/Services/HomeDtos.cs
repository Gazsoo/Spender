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
