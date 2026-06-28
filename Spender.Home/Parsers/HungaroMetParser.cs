// Spender.Home/Parsers/HungaroMetParser.cs
using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using Spender.Home.Services;

namespace Spender.Home.Parsers;

public class HungaroMetParser
{
    private const string BaseUrl = "https://odp.met.hu/weather/weather_reports/synoptic/hungary/10_minutes/";
    private readonly HttpClient _http;

    public HungaroMetParser(HttpClient http) => _http = http;

    public async Task<HungaroMetDto?> FetchLatestAsync(string stationId, CancellationToken ct = default)
    {
        // Files are named HABP_10M_SYNOP_<YYYYMMDDHHmmSS>.csv.zip — find the latest one
        var index = await _http.GetStringAsync(BaseUrl, ct);
        var matches = Regex.Matches(index, @"href=""(HABP_10M_SYNOP_\d{14}\.csv\.zip)""");
        if (matches.Count == 0) return null;

        var latest = matches.Cast<Match>()
            .Select(m => m.Groups[1].Value)
            .OrderDescending()
            .First();

        var zipBytes = await _http.GetByteArrayAsync(BaseUrl + latest, ct);
        var csv = ExtractCsvFromZip(zipBytes);

        return ParseCsv(csv, stationId);
    }

    private static string ExtractCsvFromZip(byte[] zipBytes)
    {
        using var ms = new MemoryStream(zipBytes);
        using var archive = new ZipArchive(ms, ZipArchiveMode.Read);
        var entry = archive.Entries.First(e => e.Name.EndsWith(".csv", StringComparison.OrdinalIgnoreCase));
        using var reader = new StreamReader(entry.Open(), Encoding.Latin1);
        return reader.ReadToEnd();
    }

    internal static HungaroMetDto? ParseCsv(string csv, string stationId)
    {
        var lines = csv.ReplaceLineEndings("\n").Split('\n', StringSplitOptions.RemoveEmptyEntries);

        // First non-comment, non-empty line is the header
        var headerLine = lines.FirstOrDefault(l => !l.TrimStart().StartsWith('#'));
        if (headerLine is null) return null;

        var headers = headerLine.Split(';').Select(h => h.Trim()).ToArray();
        var stationIdx = Array.IndexOf(headers, "StationNumber");
        if (stationIdx < 0) return null;

        foreach (var line in lines.Skip(1))
        {
            if (string.IsNullOrWhiteSpace(line) || line.TrimStart().StartsWith('#')) continue;
            var fields = line.Split(';').Select(f => f.Trim()).ToArray();
            if (fields.Length <= stationIdx) continue;
            if (fields[stationIdx] != stationId) continue;

            return ExtractReading(headers, fields);
        }

        return null;
    }

    private static double? GetField(string[] headers, string[] fields, string name)
    {
        var idx = Array.IndexOf(headers, name);
        if (idx < 0 || idx >= fields.Length) return null;

        // Check quality-control flag (Q_<name>) — 0 = good, non-zero = reject
        var qIdx = Array.IndexOf(headers, "Q_" + name);
        if (qIdx >= 0 && qIdx < fields.Length &&
            int.TryParse(fields[qIdx], out var qc) && qc != 0)
            return null;

        if (!double.TryParse(fields[idx], NumberStyles.Any, CultureInfo.InvariantCulture, out var v))
            return null;

        // -999 is the HungaroMet missing/invalid value sentinel
        return v <= -999 ? null : v;
    }

    private static HungaroMetDto? ExtractReading(string[] headers, string[] fields)
    {
        var t = GetField(headers, fields, "t");
        var u = GetField(headers, fields, "u");
        var p = GetField(headers, fields, "p");
        var fs = GetField(headers, fields, "fs");
        var fsd = GetField(headers, fields, "fsd");

        // Temperature, humidity, and pressure are required
        if (t is null || u is null || p is null) return null;

        var windSpeedMs = fs ?? 0.0;
        var feelsLike = SensorMath.FeelsLike(t.Value, u.Value, windSpeedMs);

        var timeIdx = Array.IndexOf(headers, "Time");
        DateTime observedAt = DateTime.UtcNow;
        if (timeIdx >= 0 && timeIdx < fields.Length)
        {
            DateTime.TryParseExact(fields[timeIdx], "yyyyMMddHHmm",
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out observedAt);
        }

        var nameIdx = Array.IndexOf(headers, "StationName");
        var stationName = nameIdx >= 0 && nameIdx < fields.Length
            ? fields[nameIdx]
            : "Budapest Lágymányos";

        return new HungaroMetDto(
            Temperature: (decimal)t.Value,
            FeelsLike: (decimal)feelsLike,
            Humidity: (decimal)u.Value,
            Pressure: (decimal)p.Value,
            WindSpeed: (decimal)(fs ?? 0),
            WindDirection: (int)(fsd ?? 0),
            StationName: stationName,
            ObservedAt: observedAt
        );
    }
}
