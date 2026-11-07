namespace Spender.Auth;

public interface IGoogleTokenValidator
{
    Task<GoogleTokenPayload?> ValidateAsync(string credential, string clientId);
}
