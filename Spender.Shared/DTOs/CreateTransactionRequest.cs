using Spender.Shared.Models;

namespace Spender.Shared.DTOs;

public class CreateTransactionRequest
{
    public required decimal Amount { get; set; }
    public required string Description { get; set; }
    public DateTime Date { get; set; }
    public int CategoryId { get; set; }
    public ExpenseType ExpenseType { get; set; } = ExpenseType.Personal;
    public int? PaidById { get; set; }
    public int? FundedById { get; set; }
}

public class UpdateTransactionRequest
{
    public required decimal Amount { get; set; }
    public required string Description { get; set; }
    public DateTime Date { get; set; }
    public int CategoryId { get; set; }
    public ExpenseType ExpenseType { get; set; } = ExpenseType.Personal;
    public int? PaidById { get; set; }
    public int? FundedById { get; set; }
}
