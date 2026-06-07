using MediatR;
using Microsoft.Extensions.Logging;

namespace Spender.Analytics.EventHandlers;

public class TransactionEventHandler :
    INotificationHandler<TransactionCreatedEvent>,
    INotificationHandler<TransactionUpdatedEvent>,
    INotificationHandler<TransactionDeletedEvent>
{
    private readonly ILogger<TransactionEventHandler> _logger;

    public TransactionEventHandler(ILogger<TransactionEventHandler> logger)
    {
        _logger = logger;
    }

    public async Task Handle(TransactionCreatedEvent notification, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Transaction {TransactionId} created for amount {Amount}",
            notification.Transaction.Id, notification.Transaction.Amount);

        // Here you could invalidate analytics cache, update materialized views, etc.
        await Task.CompletedTask;
    }

    public async Task Handle(TransactionUpdatedEvent notification, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Transaction {TransactionId} updated from {OldAmount} to {NewAmount}",
            notification.Transaction.Id, notification.PreviousTransaction.Amount, notification.Transaction.Amount);

        await Task.CompletedTask;
    }

    public async Task Handle(TransactionDeletedEvent notification, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Transaction {TransactionId} deleted (amount {Amount})",
            notification.Transaction.Id, notification.Transaction.Amount);

        await Task.CompletedTask;
    }
}