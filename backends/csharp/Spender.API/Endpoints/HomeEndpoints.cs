using Microsoft.AspNetCore.Mvc;
using Spender.Home.Services;

namespace Spender.API.Endpoints;

public static class HomeEndpoints
{
    public static void MapHomeEndpoints(this WebApplication app)
    {
        app.MapGet("/api/home", async ([FromServices] IHomeDashboardService service, CancellationToken ct) =>
        {
            var dashboard = await service.GetDashboardAsync(ct);
            return Results.Ok(dashboard);
        })
        .WithName("GetHome")
        .WithTags("Home")
        .RequireAuthorization()
        .Produces<HomeDashboardResponse>();

        // Internal-only: called by Python sensor service via docker network, not via Caddy
        app.MapPost("/api/home/ingest", async (SensorIngestRequest req, [FromServices] ISensorIngestService service, CancellationToken ct) =>
        {
            await service.IngestAsync(req, ct);
            return Results.NoContent();
        })
        .WithName("IngestSensorReading")
        .WithTags("Home")
        .Produces(StatusCodes.Status204NoContent);
    }
}
