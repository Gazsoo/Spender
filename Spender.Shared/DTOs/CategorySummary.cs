namespace Spender.Shared.DTOs;

public class CategorySummary
{
    public int CategoryId { get; set; }
    public required string CategoryName { get; set; }
    public decimal Amount { get; set; }
    public int TransactionCount { get; set; }
}