using Microsoft.Extensions.Options;

namespace Spender.Auth;

public class AuthService : IAuthService
{
    private readonly IGoogleTokenValidator _validator;
    private readonly AuthOptions _options;

    public AuthService(IGoogleTokenValidator validator, IOptions<AuthOptions> options)
    {
        _validator = validator;
        _options = options.Value;
    }

    public async Task<AuthResult> AuthenticateWithGoogleAsync(string credential)
    {
        var payload = await _validator.ValidateAsync(credential, _options.ClientId);
        if (payload is null)
            return AuthResult.Failure(AuthFailureReason.InvalidToken);

        var allowedEmails = _options.AllowedEmails
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var isAllowed = allowedEmails.Any(email =>
            string.Equals(email, payload.Email, StringComparison.OrdinalIgnoreCase));

        if (!isAllowed)
            return AuthResult.Failure(AuthFailureReason.EmailNotAllowed);

        return AuthResult.Success(new AuthenticatedUser(payload.Email, payload.Name));
    }
}
