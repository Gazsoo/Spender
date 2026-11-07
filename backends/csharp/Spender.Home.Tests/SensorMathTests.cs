// Spender.Home.Tests/SensorMathTests.cs
using Spender.Home.Services;

namespace Spender.Home.Tests;

public class SensorMathTests
{
    [Fact]
    public void DewPoint_Returns_CorrectValue_At22C_55Pct()
    {
        var result = SensorMath.DewPoint(22.0, 55.0);
        Assert.InRange(result, 12.0, 13.0);  // expected ~12.54°C
    }

    [Fact]
    public void DewPoint_Returns_CorrectValue_At10C_80Pct()
    {
        var result = SensorMath.DewPoint(10.0, 80.0);
        Assert.InRange(result, 6.5, 7.5);   // expected ~7.0°C
    }

    [Fact]
    public void FeelsLike_Indoor_LowerThanRawAtHighTemp()
    {
        // At 30°C / 60% humidity / 0 wind, BOM AT < raw temp (feels like is reduced by the -4 offset)
        var result = SensorMath.FeelsLike(30.0, 60.0, 0);
        Assert.InRange(result, 25.0, 30.0);
    }

    [Fact]
    public void FeelsLike_Wind_LowersApparentTemp()
    {
        var noWind = SensorMath.FeelsLike(15.0, 50.0, 0);
        var withWind = SensorMath.FeelsLike(15.0, 50.0, 5);  // 5 m/s wind
        Assert.True(withWind < noWind, "Wind should lower apparent temperature");
    }

    [Fact]
    public void Compensate_Subtracts_CpuExcess()
    {
        // cpu=52°C, raw=27°C, factor=0.5 → 27 - (52-25)*0.5 = 13.5°C
        var result = SensorMath.Compensate(27.0, 52.0, 0.5);
        Assert.Equal(13.5, result, precision: 4);
    }

    [Fact]
    public void Compensate_NoOffset_WhenCpuIs25()
    {
        var result = SensorMath.Compensate(22.0, 25.0, 0.5);
        Assert.Equal(22.0, result, precision: 4);
    }

    [Theory]
    [InlineData("sensehat")]
    [InlineData(null)]
    [InlineData("")]
    public void IsSelfHeatingSource_True_ForSenseHatAndLegacyClients(string? source)
    {
        Assert.True(SensorMath.IsSelfHeatingSource(source));
    }

    [Theory]
    [InlineData("ds18b20")]
    [InlineData("mock")]
    public void IsSelfHeatingSource_False_ForExternalSensors(string source)
    {
        Assert.False(SensorMath.IsSelfHeatingSource(source));
    }
}
