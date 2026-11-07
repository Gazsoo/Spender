using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.OpenApi;
using Spender.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using Spender.Infrastructure.Data;
using Spender.Transactions.Services;
using Spender.Categories.Services;
using Spender.Analytics.Services;
using Spender.Analytics.EventHandlers;
using Spender.Home;
using Spender.Home.Background;
using Spender.Home.Parsers;
using Spender.Home.Services;

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
        services.AddScoped<ISensorIngestService, SensorIngestService>();
        services.AddScoped<IHomeDashboardService, HomeDashboardService>();
        services.AddHttpClient<HungaroMetParser>();
        services.AddHttpClient<OpenMeteoClient>();
        services.AddHostedService<WeatherBackgroundService>();

        // Home options
        services.Configure<HomeOptions>(configuration.GetSection(HomeOptions.SectionName));

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

            // Numeric properties are emitted as "integer|string"/"number|string" unions with a
            // string-pattern fallback by default. Our API always serializes them as JSON numbers,
            // so collapse the union to keep generated client types as plain `number`.
            options.AddSchemaTransformer((schema, _, _) =>
            {
                if (schema.Type is { } type
                    && type.HasFlag(JsonSchemaType.String)
                    && (type.HasFlag(JsonSchemaType.Integer) || type.HasFlag(JsonSchemaType.Number)))
                {
                    schema.Type = type & ~JsonSchemaType.String;
                    schema.Pattern = null;
                }

                return Task.CompletedTask;
            });

            // C# enums are emitted as bare integers with no member info. Attach the numeric values
            // and names (via x-enumNames, which Orval understands) so generated client enums use
            // readable member names instead of NUMBER_0/NUMBER_1/etc.
            options.AddSchemaTransformer((schema, context, _) =>
            {
                var type = Nullable.GetUnderlyingType(context.JsonTypeInfo.Type) ?? context.JsonTypeInfo.Type;
                if (!type.IsEnum)
                {
                    return Task.CompletedTask;
                }

                var names = Enum.GetNames(type);
                var values = Enum.GetValues(type);
                var enumValues = new List<JsonNode>();
                var enumNames = new JsonArray();
                for (var i = 0; i < names.Length; i++)
                {
                    enumValues.Add(JsonValue.Create(Convert.ToInt64(values.GetValue(i))));
                    enumNames.Add(JsonValue.Create(names[i]));
                }

                schema.Enum = enumValues;
                schema.Extensions ??= new Dictionary<string, IOpenApiExtension>();
                schema.Extensions["x-enumNames"] = new JsonNodeExtension(enumNames);

                return Task.CompletedTask;
            });

            // Properties whose getters are non-nullable (value types, non-nullable reference types,
            // and reference types with non-null defaults like `= []`) are always present in the
            // serialized JSON, but the generator only marks `required` members using the `required`
            // keyword. Mark them required so generated client types reflect the real response contract.
            options.AddSchemaTransformer((schema, context, _) =>
            {
                if (schema.Properties is null)
                {
                    return Task.CompletedTask;
                }

                foreach (var property in context.JsonTypeInfo.Properties)
                {
                    if (schema.Properties.ContainsKey(property.Name) && !property.IsGetNullable)
                    {
                        schema.Required ??= new HashSet<string>();
                        schema.Required.Add(property.Name);
                    }
                }

                return Task.CompletedTask;
            });
        });

        // CORS — the frontend origin must be named explicitly because
        // cookies require AllowCredentials(), which is incompatible with AllowAnyOrigin()
        services.AddCors(options =>
        {
            options.AddPolicy("Frontend", policy =>
            {
                var allowedOrigin = configuration["Cors:AllowedOrigin"];
                if (string.IsNullOrWhiteSpace(allowedOrigin))
                {
                    Console.Out.WriteLine(
                        "WARNING: Cors:AllowedOrigin is not configured — the 'Frontend' CORS policy will reject all cross-origin requests.");
                    return;
                }

                policy.WithOrigins(allowedOrigin)
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .AllowCredentials();
            });
        });

        // Authentication & Authorization — Google sign-in via a server-side cookie session
        services.Configure<AuthOptions>(configuration.GetSection(AuthOptions.SectionName));
        services.AddScoped<IGoogleTokenValidator, GoogleTokenValidator>();
        services.AddScoped<IAuthService, AuthService>();

        services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(options =>
            {
                options.Cookie.Name = "spender_session";
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.ExpireTimeSpan = TimeSpan.FromDays(30);
                options.SlidingExpiration = true;

                // This is an API: return 401/403 instead of redirecting to a login page
                options.Events.OnRedirectToLogin = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    return Task.CompletedTask;
                };
                options.Events.OnRedirectToAccessDenied = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return Task.CompletedTask;
                };
            });

        services.AddAuthorization();

        return services;
    }
}