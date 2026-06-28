// Spender.Shared/Models/WeatherCache.cs
namespace Spender.Shared.Models;

public class WeatherCache
{
    public string Source { get; set; } = string.Empty;   // PK — "HungaroMet" or "OpenMeteo"
    public DateTime FetchedAt { get; set; }
    public string Payload { get; set; } = string.Empty;  // JSON
}
