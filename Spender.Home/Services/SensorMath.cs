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

    /// <summary>Steadman/Rothfusz Heat Index (°C). Returns tempC unchanged below 27°C where HI is not meaningful.</summary>
    public static double FeelsLikeHeatIndex(double tempC, double humidityPct)
    {
        if (tempC < 27.0) return tempC;

        double T = tempC, R = humidityPct;
        return -8.78469475556
            + 1.61139411 * T
            + 2.33854883889 * R
            - 0.14611605 * T * R
            - 0.012308094 * T * T
            - 0.0164248277778 * R * R
            + 0.002211732 * T * T * R
            + 0.00072546 * T * R * R
            - 0.000003582 * T * T * R * R;
    }

    /// <summary>CPU heat compensation. Default factor 0.5 (tunable).</summary>
    public static double Compensate(double tempRaw, double cpuTempC, double factor = 0.5)
        => tempRaw - (cpuTempC - 25.0) * factor;
}
