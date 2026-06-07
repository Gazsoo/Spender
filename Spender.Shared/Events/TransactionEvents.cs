using Spender.Shared.Models;

namespace Spender.Shared.Events;

public abstract class TransactionEvent : IDomainEvent
{
    public DateTime OccurredOn { get; } = DateTime.UtcNow;
    public Guid EventId { get; } = Guid.NewGuid();
    public required Transaction Transaction { get; init; }
}

public class TransactionCreatedEvent : TransactionEvent
{
}

public class TransactionUpdatedEvent : TransactionEvent
{
    public required Transaction PreviousTransaction { get; init; }
}

public class TransactionDeletedEvent : TransactionEvent
{
}