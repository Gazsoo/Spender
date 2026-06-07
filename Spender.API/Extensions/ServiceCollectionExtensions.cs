using Microsoft.EntityFrameworkCore;
using Spender.Infrastructure.Data;
using Spender.Transactions.Services;
using Spender.Categories.Services;
using Spender.Analytics.Services;
using Spender.Analytics.EventHandlers;

namespace Spender.API.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddSpenderServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Database
        services.AddDbContext<SpenderDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("Default")));

        // Register DbContext as generic DbContext for microservices
        services.AddScoped<DbContext>(provider => provider.GetRequiredService<SpenderDbContext>());

        // Domain Services from microservices
        services.AddScoped<Spender.Transactions.Services.ITransactionService, Spender.Transactions.Services.TransactionService>();
        services.AddScoped<Spender.Categories.Services.ICategoryService, Spender.Categories.Services.CategoryService>();
        services.AddScoped<Spender.Analytics.Services.IAnalyticsService, Spender.Analytics.Services.AnalyticsService>();

        // MediatR for domain events
        services.AddMediatR(config =>
        {
            config.RegisterServicesFromAssemblyContaining<Program>(); // API assembly
            config.RegisterServicesFromAssemblyContaining<TransactionService>(); // Transactions assembly
            config.RegisterServicesFromAssemblyContaining<CategoryService>(); // Categories assembly
            config.RegisterServicesFromAssemblyContaining<AnalyticsService>(); // Analytics assembly
        });

        // Native .NET 10 OpenAPI document generation
        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer((doc, _, _) =>
            {
                doc.Info.Title = "Spender API";
                doc.Info.Version = "v1";
                doc.Info.Description = "Household spending tracker API";
                return Task.CompletedTask;
            });
        });

        // CORS
        services.AddCors(options =>
        {
            options.AddPolicy("Development", policy =>
            {
                policy.AllowAnyOrigin()
                      .AllowAnyMethod()
                      .AllowAnyHeader();
            });
        });

        return services;
    }
}