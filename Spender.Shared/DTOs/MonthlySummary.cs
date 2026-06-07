namespace Spender.Shared.DTOs;

public class MonthlySummary
{
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal TotalAmount { get; set; }
    public int TransactionCount { get; set; }
    public List<CategorySummary> Categories { get; set; } = [];
}