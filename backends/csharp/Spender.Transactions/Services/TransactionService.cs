using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Spender.Transactions.Services;

public class TransactionService : ITransactionService
{
    private readonly DbContext _context;
    private readonly IMediator _mediator;

    public TransactionService(DbContext context, IMediator mediator)
    {
        _context = context;
        _mediator = mediator;
    }

    public async Task<IEnumerable<Transaction>> GetAllTransactionsAsync()
    {
        return await _context.Set<Transaction>()
            .Include(t => t.Category)
            .OrderByDescending(t => t.Date)
            .ToListAsync();
    }

    public async Task<Transaction?> GetTransactionByIdAsync(int id)
    {
        return await _context.Set<Transaction>()
            .Include(t => t.Category)
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<Transaction> CreateTransactionAsync(CreateTransactionRequest request)
    {
        if (request.Amount <= 0)
            throw new ArgumentException("Amount must be greater than 0");

        if (string.IsNullOrWhiteSpace(request.Description))
            throw new ArgumentException("Description is required");

        if (request.ExpenseType == ExpenseType.Shared && request.PaidById is null)
            throw new ArgumentException("PaidById is required for Shared expense type");

        if (request.ExpenseType == ExpenseType.SharedPrepaidByOne && request.FundedById is null)
            throw new ArgumentException("FundedById is required for SharedPrepaidByOne expense type");

        var categoryExists = await _context.Set<Category>().AnyAsync(c => c.Id == request.CategoryId);
        if (!categoryExists)
            throw new ArgumentException("Invalid category");

        var transaction = new Transaction
        {
            Amount = request.Amount,
            Description = request.Description.Trim(),
            Date = DateTime.SpecifyKind(request.Date, DateTimeKind.Utc),
            CategoryId = request.CategoryId,
            CreatedAt = DateTime.UtcNow,
            ExpenseType = request.ExpenseType,
            PaidById = request.PaidById,
            FundedById = request.FundedById
        };

        _context.Set<Transaction>().Add(transaction);
        await _context.SaveChangesAsync();

        // Publish domain event
        await _mediator.Publish(new TransactionCreatedEvent { Transaction = transaction });

        return await GetTransactionByIdAsync(transaction.Id) ?? transaction;
    }

    public async Task<Transaction> UpdateTransactionAsync(int id, UpdateTransactionRequest request)
    {
        var existing = await _context.Set<Transaction>().FindAsync(id);
        if (existing == null)
            throw new ArgumentException("Transaction not found");

        if (request.Amount <= 0)
            throw new ArgumentException("Amount must be greater than 0");

        if (string.IsNullOrWhiteSpace(request.Description))
            throw new ArgumentException("Description is required");

        if (request.ExpenseType == ExpenseType.Shared && request.PaidById is null)
            throw new ArgumentException("PaidById is required for Shared expense type");

        if (request.ExpenseType == ExpenseType.SharedPrepaidByOne && request.FundedById is null)
            throw new ArgumentException("FundedById is required for SharedPrepaidByOne expense type");

        var categoryExists = await _context.Set<Category>().AnyAsync(c => c.Id == request.CategoryId);
        if (!categoryExists)
            throw new ArgumentException("Invalid category");

        // Create a copy for the event
        var previousTransaction = new Transaction
        {
            Id = existing.Id,
            Amount = existing.Amount,
            Description = existing.Description,
            Date = existing.Date,
            CategoryId = existing.CategoryId,
            CreatedAt = existing.CreatedAt,
            ExpenseType = existing.ExpenseType,
            PaidById = existing.PaidById,
            FundedById = existing.FundedById
        };

        existing.Amount = request.Amount;
        existing.Description = request.Description.Trim();
        existing.Date = DateTime.SpecifyKind(request.Date, DateTimeKind.Utc);
        existing.CategoryId = request.CategoryId;
        existing.ExpenseType = request.ExpenseType;
        existing.PaidById = request.PaidById;
        existing.FundedById = request.FundedById;

        await _context.SaveChangesAsync();

        // Publish domain event
        await _mediator.Publish(new TransactionUpdatedEvent
        {
            Transaction = existing,
            PreviousTransaction = previousTransaction
        });

        return await GetTransactionByIdAsync(id) ?? existing;
    }

    public async Task<bool> DeleteTransactionAsync(int id)
    {
        var transaction = await _context.Set<Transaction>().FindAsync(id);
        if (transaction == null)
            return false;

        _context.Set<Transaction>().Remove(transaction);
        await _context.SaveChangesAsync();

        // Publish domain event
        await _mediator.Publish(new TransactionDeletedEvent { Transaction = transaction });

        return true;
    }
}