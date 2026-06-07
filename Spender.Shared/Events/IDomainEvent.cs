using MediatR;

namespace Spender.Shared.Events;

public interface IDomainEvent : INotification
{
    DateTime OccurredOn { get; }
    Guid EventId { get; }
}