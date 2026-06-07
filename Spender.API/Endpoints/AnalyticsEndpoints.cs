using Spender.Analytics.Services;

namespace Spender.API.Endpoints;

public static class AnalyticsEndpoints
{
    public static void MapAnalyticsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/analytics").WithTags("Analytics");

        group.MapGet("/monthly", async (int? year, int? month, IAnalyticsService service) =>
        {
            var summary = await service.GetMonthlySummaryAsync(year, month);
            return Results.Ok(summary);
        })
        .WithName("GetMonthlyAnalytics")
        .Produces<Spender.Shared.DTOs.MonthlySummary>();

        group.MapGet("/yearly", async (int? year, IAnalyticsService service) =>
        {
            var summaries = await service.GetYearlySummaryAsync(year);
            return Results.Ok(summaries);
        })
        .WithName("GetYearlyAnalytics")
        .Produces<IEnumerable<Spender.Shared.DTOs.MonthlySummary>>();

        group.MapGet("/debt", async (int perspectiveId, DateTime? from, DateTime? to, IAnalyticsService service) =>
        {
            var summary = await service.GetDebtSummaryAsync(perspectiveId, from, to);
            return Results.Ok(summary);
        })
        .WithName("GetDebtSummary")
        .Produces<Spender.Shared.DTOs.DebtSummary>()
        .Produces(StatusCodes.Status400BadRequest);
    }
}