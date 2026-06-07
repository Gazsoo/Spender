namespace Spender.Analytics.Services;

public interface IAnalyticsService : IDomainService
{
    Task<MonthlySummary> GetMonthlySummaryAsync(int? year, int? month);
    Task<IEnumerable<MonthlySummary>> GetYearlySummaryAsync(int? year);
    Task<DebtSummary> GetDebtSummaryAsync(int perspectiveId, DateTime? from, DateTime? to);
}