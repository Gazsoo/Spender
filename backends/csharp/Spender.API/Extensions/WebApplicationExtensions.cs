using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using Spender.Infrastructure.Data;
using Spender.API.Endpoints;

namespace Spender.API.Extensions;

public static class WebApplicationExtensions
{
    public static WebApplication ConfigureSpenderApp(this WebApplication app)
    {
        // Configure middleware
        app.UseCors("Frontend");

        if (app.Environment.IsDevelopment())
        {
            // OpenAPI JSON: /openapi/v1.json
            app.MapOpenApi();
            // Scalar UI: /scalar
            app.MapScalarApiReference();
        }

        app.UseAuthentication();
        app.UseAuthorization();

        // Apply migrations on startup (skipped when no connection string is configured,
        // e.g. when the OpenAPI document is generated at build time without a running database)
        if (!string.IsNullOrEmpty(app.Configuration.GetConnectionString("Default")))
        {
            using var scope = app.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<SpenderDbContext>();
            context.Database.Migrate();
        }

        // Map endpoints
        app.MapGet("/", () => "Spender API v1.0");
        app.MapAuthEndpoints();
        app.MapTransactionEndpoints();
        app.MapCategoryEndpoints();
        app.MapAnalyticsEndpoints();
        app.MapPeopleEndpoints();
        app.MapHomeEndpoints();

        return app;
    }
}