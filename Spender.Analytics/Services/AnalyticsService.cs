using Microsoft.EntityFrameworkCore;
using Spender.Shared.Common;

namespace Spender.Analytics.Services;

public class AnalyticsService : IAnalyticsService
{
    private readonly DbContext _context;

    public AnalyticsService(DbContext context)
    {
        _context = context;
    }

    public async Task<MonthlySummary> GetMonthlySummaryAsync(int? year, int? month)
    {
        var targetDate = DateTime.SpecifyKind(new DateTime(year ?? DateTime.Now.Year, month ?? DateTime.Now.Month, 1), DateTimeKind.Utc);
        var nextMonth = targetDate.AddMonths(1);

        var transactions = await _context.Set<Transaction>()
            .Include(t => t.Category)
            .Where(t => t.Date >= targetDate && t.Date < nextMonth)
            .ToListAsync();

        return new MonthlySummary
        {
            Year = targetDate.Year,
            Month = targetDate.Month,
            TotalAmount = transactions.Sum(t => t.Amount),
            TransactionCount = transactions.Count,
            Categories = transactions
                .GroupBy(t => new { t.CategoryId, t.Category.Name, t.Category.Color })
                .Select(g => new CategorySummary
                {
                    CategoryId = g.Key.CategoryId,
                    CategoryName = g.Key.Name,
                    Color = g.Key.Color,
                    Amount = g.Sum(t => t.Amount),
                    TransactionCount = g.Count()
                })
                .OrderByDescending(c => c.Amount)
                .ToList()
        };
    }

    public async Task<IEnumerable<MonthlySummary>> GetYearlySummaryAsync(int? year)
    {
        var targetYear = year ?? DateTime.Now.Year;
        var startDate = DateTime.SpecifyKind(new DateTime(targetYear, 1, 1), DateTimeKind.Utc);
        var endDate = DateTime.SpecifyKind(new DateTime(targetYear + 1, 1, 1), DateTimeKind.Utc);

        return await _context.Set<Transaction>()
            .Include(t => t.Category)
            .Where(t => t.Date >= startDate && t.Date < endDate)
            .GroupBy(t => new { t.Date.Year, t.Date.Month })
            .Select(g => new MonthlySummary
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                TotalAmount = g.Sum(t => t.Amount),
                TransactionCount = g.Count(),
                Categories = g.GroupBy(t => new { t.CategoryId, t.Category.Name, t.Category.Color })
                             .Select(cg => new CategorySummary
                             {
                                 CategoryId = cg.Key.CategoryId,
                                 CategoryName = cg.Key.Name,
                                 Color = cg.Key.Color,
                                 Amount = cg.Sum(t => t.Amount),
                                 TransactionCount = cg.Count()
                             })
                             .OrderByDescending(c => c.Amount)
                             .ToList()
            })
            .OrderBy(m => m.Month)
            .ToListAsync();
    }

    public async Task<DebtSummary> GetDebtSummaryAsync(int perspectiveId, DateTime? from, DateTime? to)
    {
        var person = await _context.Set<Person>().FindAsync(perspectiveId)
            ?? throw new ArgumentException($"Person {perspectiveId} not found");

        var query = _context.Set<Transaction>()
            .Include(t => t.PaidBy)
            .Include(t => t.FundedBy)
            .Where(t => t.ExpenseType == ExpenseType.Shared ||
                        t.ExpenseType == ExpenseType.SharedPrepaidByOne);

        if (from.HasValue)
            query = query.Where(t => t.Date >= DateTime.SpecifyKind(from.Value, DateTimeKind.Utc));
        if (to.HasValue)
            query = query.Where(t => t.Date <= DateTime.SpecifyKind(to.Value, DateTimeKind.Utc));

        var transactions = await query.ToListAsync();

        var breakdown = transactions
            .GroupBy(t => t.ExpenseType == ExpenseType.Shared ? t.PaidById : t.FundedById)
            .Where(g => g.Key.HasValue)
            .Select(g =>
            {
                var first = g.First();
                var counterpartyName = first.ExpenseType == ExpenseType.Shared
                    ? first.PaidBy?.Name ?? g.Key.ToString()!
                    : first.FundedBy?.Name ?? g.Key.ToString()!;
                return new DebtByPerson
                {
                    PersonId = g.Key!.Value,
                    PersonName = counterpartyName,
                    Debt = g.Sum(t => DebtCalculator.GetDebt(t, perspectiveId)),
                    TransactionCount = g.Count()
                };
            })
            .OrderBy(d => d.PersonName)
            .ToList();

        return new DebtSummary
        {
            PerspectiveId = perspectiveId,
            PerspectiveName = person.Name,
            NetDebt = transactions.Sum(t => DebtCalculator.GetDebt(t, perspectiveId)),
            TransactionCount = transactions.Count,
            Breakdown = breakdown
        };
    }
}