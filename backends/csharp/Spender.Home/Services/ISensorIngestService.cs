// Spender.Home/Services/ISensorIngestService.cs
namespace Spender.Home.Services;

public interface ISensorIngestService
{
    Task IngestAsync(SensorIngestRequest request, CancellationToken ct = default);
}
