using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Spender.Auth;

namespace Spender.API.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/google", async (GoogleLoginRequest request, IAuthService authService, HttpContext context) =>
        {
            var result = await authService.AuthenticateWithGoogleAsync(request.Credential);

            if (!result.IsSuccess || result.User is null)
            {
                var reason = result.FailureReason == AuthFailureReason.EmailNotAllowed
                    ? "email_not_allowed"
                    : "invalid_token";
                return Results.Json(new AuthErrorResponse(reason), statusCode: StatusCodes.Status401Unauthorized);
            }

            var claims = new List<Claim>
            {
                new(ClaimTypes.Email, result.User.Email),
                new(ClaimTypes.Name, result.User.Name),
            };
            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            await context.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));

            return Results.Ok(new AuthUserResponse(result.User.Email, result.User.Name));
        })
        .WithName("GoogleLogin")
        .Produces<AuthUserResponse>()
        .Produces<AuthErrorResponse>(StatusCodes.Status401Unauthorized);

        group.MapPost("/logout", async (HttpContext context) =>
        {
            await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.NoContent();
        })
        .WithName("Logout")
        .Produces(StatusCodes.Status204NoContent);

        group.MapGet("/me", (ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email);
            var name = user.FindFirstValue(ClaimTypes.Name);
            if (email is null)
                return Results.Unauthorized();

            return Results.Ok(new AuthUserResponse(email, name ?? email));
        })
        .RequireAuthorization()
        .WithName("GetCurrentUser")
        .Produces<AuthUserResponse>()
        .Produces(StatusCodes.Status401Unauthorized);
    }
}
