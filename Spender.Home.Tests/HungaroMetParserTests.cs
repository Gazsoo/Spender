// Spender.Home.Tests/HungaroMetParserTests.cs
using System.Text;
using Spender.Home.Parsers;

namespace Spender.Home.Tests;

public class HungaroMetParserTests
{
    // A minimal 10-minute CSV excerpt with station 44505 and one other station.
    // Encoding is ASCII here (the real file is ISO-8859-1 but for test data ASCII suffices).
    private const string SampleCsv = """
        Time;StationNumber;StationName;Latitude;Longitude;Elevation;t;Q_t;u;Q_u;p;Q_p;fs;Q_fs;fsd;Q_fsd;EOR
        202606281200;44505;Budapest Lagymanyos;47.4747;19.0619;144.6;21.4;0;58;0;1013.2;0;3.2;0;270;0;EOR
        202606281200;99999;Other Station;47.0;19.0;100.0;20.0;0;60;0;1010.0;0;2.0;0;180;0;EOR
        """;

    [Fact]
    public void ParseCsv_ExtractsCorrectStation()
    {
        var result = HungaroMetParser.ParseCsv(SampleCsv, "44505");

        Assert.NotNull(result);
        Assert.Equal(21.4m, result.Temperature);
        Assert.Equal(58m, result.Humidity);
        Assert.Equal(1013.2m, result.Pressure);
        Assert.Equal(3.2m, result.WindSpeed);
        Assert.Equal(270, result.WindDirection);
        Assert.Contains("Lagymanyos", result.StationName);
    }

    [Fact]
    public void ParseCsv_ReturnsNull_WhenStationNotFound()
    {
        var result = HungaroMetParser.ParseCsv(SampleCsv, "00000");
        Assert.Null(result);
    }

    [Fact]
    public void ParseCsv_SkipsValue_WhenQcFlagNonZero()
    {
        var badQcCsv = """
            Time;StationNumber;StationName;Latitude;Longitude;Elevation;t;Q_t;u;Q_u;p;Q_p;fs;Q_fs;fsd;Q_fsd;EOR
            202606281200;44505;Budapest Lagymanyos;47.4747;19.0619;144.6;21.4;1;58;0;1013.2;0;3.2;0;270;0;EOR
            """;

        var result = HungaroMetParser.ParseCsv(badQcCsv, "44505");
        // t has Q_t=1 (bad QC), so Temperature should be null → returns null overall
        Assert.Null(result);
    }

    [Fact]
    public void ParseCsv_ParsesObservationTime_AsUtc()
    {
        var result = HungaroMetParser.ParseCsv(SampleCsv, "44505");

        Assert.NotNull(result);
        Assert.Equal(DateTimeKind.Utc, result.ObservedAt.Kind);
        Assert.Equal(2026, result.ObservedAt.Year);
        Assert.Equal(6, result.ObservedAt.Month);
        Assert.Equal(28, result.ObservedAt.Day);
    }

    [Fact]
    public void ParseCsv_ReturnsNull_WhenRequiredFieldIsMissingSentinel()
    {
        // Pressure = -999 (HungaroMet missing-value sentinel) → pressure is null → reading rejected
        var csv = """
            Time;StationNumber;t;Q_t;u;Q_u;p;Q_p;fs;Q_fs;fsd;Q_fsd;EOR
            202606281200;44505;21.4;0;58;0;-999;0;3.2;0;270;0;EOR
            """;

        var result = HungaroMetParser.ParseCsv(csv, "44505");
        Assert.Null(result);
    }

    [Fact]
    public void ParseCsv_HandlesRealWorldFormat_BlankQcAndStationNumberFirst()
    {
        // Matches actual HungaroMet format: StationNumber first, blank QC fields, no StationName column
        var csv = """
            StationNumber;        Time;    t; Q_t;   u; Q_u;      p; Q_p;   fs;Q_fs; fsd;Q_fsd;EOR
                    44505;202606281200; 21.4;   ; 58;   ; 1013.2;   ;  3.2;   ; 270;   ;EOR
            """;

        var result = HungaroMetParser.ParseCsv(csv, "44505");

        Assert.NotNull(result);
        Assert.Equal(21.4m, result.Temperature);
        Assert.Equal(58m, result.Humidity);
        Assert.Equal(1013.2m, result.Pressure);
    }
}
