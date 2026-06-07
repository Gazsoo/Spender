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
        if (app.Environment.IsDevelopment())
        {
            app.UseCors("Development");
            // OpenAPI JSON: /openapi/v1.json
            app.MapOpenApi();
            // Scalar UI: /scalar
            app.MapScalarApiReference();
        }

        // Apply migrations on startup
        using (var scope = app.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<SpenderDbContext>();
            context.Database.Migrate();
        }

        // Map endpoints
        app.MapGet("/", () => "Spender API v1.0");
        app.MapTransactionEndpoints();
        app.MapCategoryEndpoints();
        app.MapAnalyticsEndpoints();
        app.MapPeopleEndpoints();

        return app;
    }
}