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
