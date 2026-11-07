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
