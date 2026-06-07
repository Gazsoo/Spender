using System.Text.Json.Nodes;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
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