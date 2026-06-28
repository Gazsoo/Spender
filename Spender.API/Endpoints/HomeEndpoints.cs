// Spender.API/Endpoints/HomeEndpoints.cs
using Spender.Home.Services;

namespace Spender.API.Endpoints;

public static class HomeEndpoints
{
    public static void MapHomeEndpoints(this WebApplication app)
    {
        // Internal-only: called by Python sensor service via docker network, not via Caddy
        app.MapPost("/api/home/ingest", async (SensorIngestRequest req, ISensorIngestService service, CancellationToken ct) =>
        {
            await service.IngestAsync(req, ct);
            return Results.NoContent();
        })
        .WithName("IngestSensorReading")
        .WithTags("Home")
        .Produces(StatusCodes.Status204NoContent);
    }
}
