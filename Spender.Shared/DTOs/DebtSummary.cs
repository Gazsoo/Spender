namespace Spender.Shared.DTOs;

public class DebtSummary
{
    public int PerspectiveId { get; set; }
    public string PerspectiveName { get; set; } = string.Empty;
    public decimal NetDebt { get; set; }
    public int TransactionCount { get; set; }
    public List<DebtByPerson> Breakdown { get; set; } = [];
}

public class DebtByPerson
{
    public int PersonId { get; set; }
    public required string PersonName { get; set; }
    public decimal Debt { get; set; }
    public int TransactionCount { get; set; }
}
