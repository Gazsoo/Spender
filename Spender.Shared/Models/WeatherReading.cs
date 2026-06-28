namespace Spender.Shared.Models;

public class WeatherReading
{
    public int Id { get; set; }
    public string Source { get; set; } = string.Empty; // "HungaroMet" | "OpenMeteo"
    public DateTime FetchedAt { get; set; }
    public decimal Temperature { get; set; }
    public decimal FeelsLike { get; set; }
    public decimal Humidity { get; set; }
    public decimal Pressure { get; set; }
    public decimal WindSpeed { get; set; }
    // HungaroMet-only
    public int? WindDirection { get; set; }
    public string? StationName { get; set; }
    public DateTime? ObservedAt { get; set; }
    // OpenMeteo-only
    public int? WeatherCode { get; set; }
    public string? ForecastJson { get; set; }
}
