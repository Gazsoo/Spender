namespace Spender.Shared.Models;

public class Transaction
{
    public int Id { get; set; }
    public required decimal Amount { get; set; }
    public required string Description { get; set; }
    public DateTime Date { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    public ExpenseType ExpenseType { get; set; } = ExpenseType.Personal;
    public int? PaidById { get; set; }
    public int? FundedById { get; set; }
    public Person? PaidBy { get; set; }
    public Person? FundedBy { get; set; }
}