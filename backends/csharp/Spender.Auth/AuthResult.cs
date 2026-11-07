namespace Spender.Auth;

public enum AuthFailureReason
{
    InvalidToken,
    EmailNotAllowed,
}

public class AuthResult
{
    public bool IsSuccess { get; private init; }
    public AuthenticatedUser? User { get; private init; }
    public AuthFailureReason? FailureReason { get; private init; }

    public static AuthResult Success(AuthenticatedUser user) =>
        new() { IsSuccess = true, User = user };

    public static AuthResult Failure(AuthFailureReason reason) =>
        new() { IsSuccess = false, FailureReason = reason };
}
