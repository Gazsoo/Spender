using Spender.Shared.Models;

namespace Spender.Shared.Common;

public static class DebtCalculator
{
    public static decimal GetDebt(Transaction tx, int perspectiveId)
    {
        return tx.ExpenseType switch
        {
            ExpenseType.Personal           => 0m,
            ExpenseType.SharedPrepaidJoint => 0m,
            ExpenseType.Shared             => tx.PaidById == perspectiveId
                ? -(tx.Amount / 2m)
                :   tx.Amount / 2m,
            ExpenseType.SharedPrepaidByOne => tx.FundedById == perspectiveId
                ? -(tx.Amount / 2m)
                :   tx.Amount / 2m,
            _ => throw new ArgumentException($"Unknown ExpenseType: {tx.ExpenseType}")
        };
    }
}
