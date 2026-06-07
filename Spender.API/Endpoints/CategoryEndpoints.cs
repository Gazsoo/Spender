using Spender.Categories.Services;
using Spender.Shared.DTOs;

namespace Spender.API.Endpoints;

public static class CategoryEndpoints
{
    public static void MapCategoryEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/categories").WithTags("Categories");

        group.MapGet("/", async (ICategoryService service) =>
        {
            var categories = await service.GetAllCategoriesAsync();
            return Results.Ok(categories);
        })
        .WithName("GetCategories")
        .Produces<IEnumerable<Spender.Shared.Models.Category>>();

        group.MapGet("/{id}", async (int id, ICategoryService service) =>
        {
            var category = await service.GetCategoryByIdAsync(id);
            return category is not null ? Results.Ok(category) : Results.NotFound();
        })
        .WithName("GetCategoryById")
        .Produces<Spender.Shared.Models.Category>()
        .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/", async (CreateCategoryRequest request, ICategoryService service) =>
        {
            try
            {
                var category = await service.CreateCategoryAsync(request);
                return Results.Created($"/api/categories/{category.Id}", category);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ex.Message);
            }
        })
        .WithName("CreateCategory")
        .Produces<Spender.Shared.Models.Category>(StatusCodes.Status201Created)
        .Produces(StatusCodes.Status400BadRequest);

        group.MapPut("/{id}", async (int id, UpdateCategoryRequest request, ICategoryService service) =>
        {
            try
            {
                var category = await service.UpdateCategoryAsync(id, request);
                return Results.Ok(category);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ex.Message);
            }
        })
        .WithName("UpdateCategory")
        .Produces<Spender.Shared.Models.Category>()
        .Produces(StatusCodes.Status400BadRequest);

        group.MapDelete("/{id}", async (int id, ICategoryService service) =>
        {
            try
            {
                var deleted = await service.DeleteCategoryAsync(id);
                return deleted ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(ex.Message);
            }
        })
        .WithName("DeleteCategory")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status400BadRequest);
    }
}
