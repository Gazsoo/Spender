namespace Spender.Transactions.Services;

public interface ITransactionService : IDomainService
{
    Task<IEnumerable<Transaction>> GetAllTransactionsAsync();
    Task<Transaction?> GetTransactionByIdAsync(int id);
    Task<Transaction> CreateTransactionAsync(CreateTransactionRequest request);
    Task<Transaction> UpdateTransactionAsync(int id, UpdateTransactionRequest request);
    Task<bool> DeleteTransactionAsync(int id);
}