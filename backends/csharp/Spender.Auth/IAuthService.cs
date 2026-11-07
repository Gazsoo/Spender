namespace Spender.Auth;

public interface IAuthService
{
    Task<AuthResult> AuthenticateWithGoogleAsync(string credential);
}
