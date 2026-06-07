using Spender.Transactions.Services;
using Spender.Shared.DTOs;

namespace Spender.API.Endpoints;

public static class TransactionEndpoints
{
    public static void MapTransactionEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/transactions").WithTags("Transactions");

        group.MapGet("/", async (ITransactionService service) =>
        {
            var transactions = await service.GetAllTransactionsAsync();
            return Results.Ok(transactions);
        })
        .Produces<IEnumerable<Spender.Shared.Models.Transaction>>();

        group.MapGet("/{id}", async (int id, ITransactionService service) =>
        {
            var transaction = await service.GetTransactionByIdAsync(id);
            return transaction is not null ? Results.Ok(transaction) : Results.NotFound();
        })
        .Produces<Spender.Shared.Models.Transaction>()
        .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/", async (CreateTransactionRequest request, ITransactionService service) =>
        {
            try
            {
                var transaction = await service.CreateTransactionAsync(request);
                return Results.Created($"/api/transactions/{transaction.Id}", transaction);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ex.Message);
            }
        })
        .Produces<Spender.Shared.Models.Transaction>(StatusCodes.Status201Created)
        .Produces(StatusCodes.Status400BadRequest);

        group.MapPut("/{id}", async (int id, UpdateTransactionRequest request, ITransactionService service) =>
        {
            try
            {
                var transaction = await service.UpdateTransactionAsync(id, request);
                return Results.Ok(transaction);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ex.Message);
            }
        })
        .Produces<Spender.Shared.Models.Transaction>()
        .Produces(StatusCodes.Status400BadRequest);

        group.MapDelete("/{id}", async (int id, ITransactionService service) =>
        {
            var deleted = await service.DeleteTransactionAsync(id);
            return deleted ? Results.NoContent() : Results.NotFound();
        })
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound);
    }
}