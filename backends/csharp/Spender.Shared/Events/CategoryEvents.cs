using Spender.Shared.Models;

namespace Spender.Shared.Events;

public abstract class CategoryEvent : IDomainEvent
{
    public DateTime OccurredOn { get; } = DateTime.UtcNow;
    public Guid EventId { get; } = Guid.NewGuid();
    public required Category Category { get; init; }
}

public class CategoryCreatedEvent : CategoryEvent
{
}

public class CategoryUpdatedEvent : CategoryEvent
{
    public required Category PreviousCategory { get; init; }
}

public class CategoryDeletedEvent : CategoryEvent
{
}