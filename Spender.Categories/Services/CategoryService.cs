using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Spender.Categories.Services;

public class CategoryService : ICategoryService
{
    private readonly DbContext _context;
    private readonly IMediator _mediator;

    public CategoryService(DbContext context, IMediator mediator)
    {
        _context = context;
        _mediator = mediator;
    }

    public async Task<IEnumerable<Category>> GetAllCategoriesAsync()
    {
        return await _context.Set<Category>()
            .OrderBy(c => c.Name)
            .ToListAsync();
    }

    public async Task<Category?> GetCategoryByIdAsync(int id)
    {
        return await _context.Set<Category>().FindAsync(id);
    }

    public async Task<Category> CreateCategoryAsync(CreateCategoryRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("Name is required");

        var nameExists = await _context.Set<Category>()
            .AnyAsync(c => c.Name.ToLower() == request.Name.ToLower());
        if (nameExists)
            throw new ArgumentException("Category name already exists");

        var category = new Category
        {
            Name = request.Name.Trim(),
            Color = request.Color?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.Set<Category>().Add(category);
        await _context.SaveChangesAsync();

        // Publish domain event
        await _mediator.Publish(new CategoryCreatedEvent { Category = category });

        return category;
    }

    public async Task<Category> UpdateCategoryAsync(int id, UpdateCategoryRequest request)
    {
        var existing = await _context.Set<Category>().FindAsync(id);
        if (existing == null)
            throw new ArgumentException("Category not found");

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("Name is required");

        var nameExists = await _context.Set<Category>()
            .AnyAsync(c => c.Id != id && c.Name.ToLower() == request.Name.ToLower());
        if (nameExists)
            throw new ArgumentException("Category name already exists");

        // Create a copy for the event
        var previousCategory = new Category
        {
            Id = existing.Id,
            Name = existing.Name,
            Color = existing.Color,
            CreatedAt = existing.CreatedAt
        };

        existing.Name = request.Name.Trim();
        existing.Color = request.Color?.Trim();

        await _context.SaveChangesAsync();

        // Publish domain event
        await _mediator.Publish(new CategoryUpdatedEvent
        {
            Category = existing,
            PreviousCategory = previousCategory
        });

        return existing;
    }

    public async Task<bool> DeleteCategoryAsync(int id)
    {
        var category = await _context.Set<Category>().FindAsync(id);
        if (category == null)
            return false;

        var hasTransactions = await _context.Set<Transaction>().AnyAsync(t => t.CategoryId == id);
        if (hasTransactions)
            throw new InvalidOperationException("Cannot delete category with existing transactions");

        _context.Set<Category>().Remove(category);
        await _context.SaveChangesAsync();

        // Publish domain event
        await _mediator.Publish(new CategoryDeletedEvent { Category = category });

        return true;
    }
}