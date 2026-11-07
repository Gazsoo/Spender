using Google.Apis.Auth;

namespace Spender.Auth;

public class GoogleTokenValidator : IGoogleTokenValidator
{
    public async Task<GoogleTokenPayload?> ValidateAsync(string credential, string clientId)
    {
        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(credential, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = [clientId],
            });

            return new GoogleTokenPayload(payload.Email, payload.Name);
        }
        catch (InvalidJwtException)
        {
            return null;
        }
    }
}
