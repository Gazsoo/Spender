# Google Login Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the entire Spender app behind Google Sign-In: a fixed email allowlist decides who gets in, and a server-side cookie session keeps them in.

**Architecture:** `Spender.Auth` validates Google ID tokens (via `Google.Apis.Auth`) and checks the resulting email against a configured allowlist. `Spender.API` wires up ASP.NET Core cookie authentication, exposes `POST /api/auth/google`, `POST /api/auth/logout`, `GET /api/auth/me`, and requires authorization on every existing endpoint group. The CORS policy is tightened from `AllowAnyOrigin` to an explicit, credentialed origin (required for cookies to flow cross-origin). The frontend (already on an Orval-generated API client — see `orval.config.ts`) regenerates its client to pick up the new `/api/auth/*` hooks, then adds a `LoginPage` with Google's official Sign-In button, an `AuthContext` that restores sessions via `/api/auth/me`, and route guarding in `App.tsx`.

**Tech Stack:** .NET 10 minimal APIs, ASP.NET Core Cookie Authentication, `Google.Apis.Auth`, xUnit + Moq, React 19, `@react-oauth/google`, TanStack Query (Orval-generated hooks)

**Reference:** Design spec at `docs/superpowers/specs/2026-06-07-google-login-design.md`

---

## Part A — `Spender.Auth`: token validation & allowlist (TDD)

### Task 1: Scaffold `Spender.Auth.Tests`

This repo has no test projects yet. We're adding one for `Spender.Auth` so the
core validation/allowlist logic can be developed test-first.

**Files:**
- Create: `Spender.Auth.Tests/Spender.Auth.Tests.csproj` (via `dotnet new xunit`)
- Delete: `Spender.Auth.Tests/UnitTest1.cs` (template scaffold file)

- [ ] **Step 1: Scaffold the project and wire references**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender
dotnet new xunit -n Spender.Auth.Tests -o Spender.Auth.Tests
dotnet add Spender.Auth.Tests reference Spender.Auth
dotnet add Spender.Auth.Tests package Moq
rm Spender.Auth.Tests/UnitTest1.cs
```

- [ ] **Step 2: Verify it builds**

Run: `dotnet build Spender.Auth.Tests`
Expected: `Build succeeded.`

- [ ] **Step 3: Commit**

```bash
git add Spender.Auth.Tests
git commit -m "scaffold Spender.Auth.Tests xUnit project with Moq"
```

---

### Task 2: Add domain models to `Spender.Auth`

These are plain data types (records/enums/options) — no behavior to TDD, just
the shapes the rest of the feature builds on.

**Files:**
- Modify: `Spender.Auth/Spender.Auth.csproj` (add `Google.Apis.Auth` package)
- Delete: `Spender.Auth/Class1.cs`
- Create: `Spender.Auth/AuthenticatedUser.cs`
- Create: `Spender.Auth/GoogleTokenPayload.cs`
- Create: `Spender.Auth/AuthOptions.cs`
- Create: `Spender.Auth/AuthResult.cs`
- Create: `Spender.Auth/GoogleLoginRequest.cs`
- Create: `Spender.Auth/AuthUserResponse.cs`
- Create: `Spender.Auth/AuthErrorResponse.cs`

- [ ] **Step 1: Add the Google auth package and remove the scaffold class**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender
dotnet add Spender.Auth package Google.Apis.Auth
rm Spender.Auth/Class1.cs
```

- [ ] **Step 2: Create `Spender.Auth/AuthenticatedUser.cs`**

```csharp
namespace Spender.Auth;

public record AuthenticatedUser(string Email, string Name);
```

- [ ] **Step 3: Create `Spender.Auth/GoogleTokenPayload.cs`**

```csharp
namespace Spender.Auth;

public record GoogleTokenPayload(string Email, string Name);
```

- [ ] **Step 4: Create `Spender.Auth/AuthOptions.cs`**

```csharp
namespace Spender.Auth;

public class AuthOptions
{
    public const string SectionName = "GoogleAuth";

    public string ClientId { get; set; } = string.Empty;

    /// <summary>
    /// Comma-separated list of email addresses allowed to sign in.
    /// Stored as a single string (rather than an array) so it can be set
    /// directly from a single environment variable, matching how
    /// DB_PASSWORD/API_DOMAIN are configured elsewhere in this project.
    /// </summary>
    public string AllowedEmails { get; set; } = string.Empty;
}
```

- [ ] **Step 5: Create `Spender.Auth/AuthResult.cs`**

```csharp
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
```

- [ ] **Step 6: Create `Spender.Auth/GoogleLoginRequest.cs`**

```csharp
namespace Spender.Auth;

public record GoogleLoginRequest(string Credential);
```

- [ ] **Step 7: Create `Spender.Auth/AuthUserResponse.cs`**

```csharp
namespace Spender.Auth;

public record AuthUserResponse(string Email, string Name);
```

- [ ] **Step 8: Create `Spender.Auth/AuthErrorResponse.cs`**

```csharp
namespace Spender.Auth;

public record AuthErrorResponse(string Reason);
```

- [ ] **Step 9: Build and commit**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender
dotnet build Spender.Auth
git add Spender.Auth
git commit -m "add Spender.Auth domain models for Google login"
```

---

### Task 3: TDD `IAuthService` / `AuthService`

This is the core decision logic: validate the token, then check the allowlist.
We mock `IGoogleTokenValidator` (defined in this task as the seam) so the tests
don't depend on Google's network/JWKS endpoint.

**Files:**
- Create: `Spender.Auth/IGoogleTokenValidator.cs`
- Create: `Spender.Auth/IAuthService.cs`
- Create: `Spender.Auth/AuthService.cs`
- Test: `Spender.Auth.Tests/AuthServiceTests.cs`

- [ ] **Step 1: Define the validator seam — `Spender.Auth/IGoogleTokenValidator.cs`**

```csharp
namespace Spender.Auth;

public interface IGoogleTokenValidator
{
    Task<GoogleTokenPayload?> ValidateAsync(string credential, string clientId);
}
```

- [ ] **Step 2: Define `Spender.Auth/IAuthService.cs`**

```csharp
namespace Spender.Auth;

public interface IAuthService
{
    Task<AuthResult> AuthenticateWithGoogleAsync(string credential);
}
```

- [ ] **Step 3: Write the failing tests — `Spender.Auth.Tests/AuthServiceTests.cs`**

```csharp
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Spender.Auth.Tests;

public class AuthServiceTests
{
    private const string ClientId = "test-client-id";

    private static IOptions<AuthOptions> OptionsWithAllowedEmails(string allowedEmails) =>
        Options.Create(new AuthOptions { ClientId = ClientId, AllowedEmails = allowedEmails });

    [Fact]
    public async Task AuthenticateWithGoogleAsync_ReturnsInvalidToken_WhenValidatorRejectsTheToken()
    {
        var validator = new Mock<IGoogleTokenValidator>();
        validator.Setup(v => v.ValidateAsync("bad-token", ClientId))
            .ReturnsAsync((GoogleTokenPayload?)null);

        var service = new AuthService(validator.Object, OptionsWithAllowedEmails("alice@gmail.com"));

        var result = await service.AuthenticateWithGoogleAsync("bad-token");

        Assert.False(result.IsSuccess);
        Assert.Equal(AuthFailureReason.InvalidToken, result.FailureReason);
        Assert.Null(result.User);
    }

    [Fact]
    public async Task AuthenticateWithGoogleAsync_ReturnsEmailNotAllowed_WhenEmailIsNotOnTheAllowlist()
    {
        var validator = new Mock<IGoogleTokenValidator>();
        validator.Setup(v => v.ValidateAsync("good-token", ClientId))
            .ReturnsAsync(new GoogleTokenPayload("stranger@gmail.com", "Stranger"));

        var service = new AuthService(validator.Object, OptionsWithAllowedEmails("alice@gmail.com,bob@gmail.com"));

        var result = await service.AuthenticateWithGoogleAsync("good-token");

        Assert.False(result.IsSuccess);
        Assert.Equal(AuthFailureReason.EmailNotAllowed, result.FailureReason);
        Assert.Null(result.User);
    }

    [Fact]
    public async Task AuthenticateWithGoogleAsync_ReturnsSuccess_WhenEmailIsOnTheAllowlist()
    {
        var validator = new Mock<IGoogleTokenValidator>();
        validator.Setup(v => v.ValidateAsync("good-token", ClientId))
            .ReturnsAsync(new GoogleTokenPayload("alice@gmail.com", "Alice"));

        var service = new AuthService(validator.Object, OptionsWithAllowedEmails("alice@gmail.com,bob@gmail.com"));

        var result = await service.AuthenticateWithGoogleAsync("good-token");

        Assert.True(result.IsSuccess);
        Assert.Null(result.FailureReason);
        Assert.Equal(new AuthenticatedUser("alice@gmail.com", "Alice"), result.User);
    }

    [Fact]
    public async Task AuthenticateWithGoogleAsync_AllowlistComparison_IsCaseInsensitiveAndTrimsWhitespace()
    {
        var validator = new Mock<IGoogleTokenValidator>();
        validator.Setup(v => v.ValidateAsync("good-token", ClientId))
            .ReturnsAsync(new GoogleTokenPayload("Alice@Gmail.com", "Alice"));

        var service = new AuthService(validator.Object, OptionsWithAllowedEmails(" alice@gmail.com , bob@gmail.com "));

        var result = await service.AuthenticateWithGoogleAsync("good-token");

        Assert.True(result.IsSuccess);
    }
}
```

- [ ] **Step 4: Run the tests to confirm they fail to compile (no `AuthService` yet)**

Run: `dotnet test Spender.Auth.Tests`
Expected: build error — `The type or namespace name 'AuthService' could not be found`

- [ ] **Step 5: Implement `Spender.Auth/AuthService.cs`**

```csharp
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
```

- [ ] **Step 6: Run the tests again — confirm they pass**

Run: `dotnet test Spender.Auth.Tests`
Expected: `Passed!  - Failed: 0, Passed: 4, Skipped: 0`

- [ ] **Step 7: Commit**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender
git add Spender.Auth Spender.Auth.Tests
git commit -m "TDD AuthService: validate Google token then check email allowlist"
```

---

### Task 4: Implement `GoogleTokenValidator`

This is a thin wrapper around `GoogleJsonWebSignature.ValidateAsync`, which
calls out to Google's JWKS endpoint over the network — not something to unit
test (and not where any of our decision logic lives; that's `AuthService`,
already covered). We implement it directly.

**Files:**
- Create: `Spender.Auth/GoogleTokenValidator.cs`

- [ ] **Step 1: Create `Spender.Auth/GoogleTokenValidator.cs`**

```csharp
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
```

- [ ] **Step 2: Build and commit**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender
dotnet build Spender.Auth
git add Spender.Auth
git commit -m "implement GoogleTokenValidator wrapping Google.Apis.Auth"
```

---

## Part B — Wire authentication into `Spender.API`

### Task 5: Register cookie authentication, authorization, and a credentialed CORS policy

The current `"Development"` CORS policy uses `AllowAnyOrigin()`, which cannot
be combined with `AllowCredentials()` — and cookies require credentials to
flow cross-origin. We replace it with a named-origin policy that's active in
all environments (the production frontend and API live on different
subdomains, so CORS applies there too, not just in dev).

**Files:**
- Modify: `Spender.API/Extensions/ServiceCollectionExtensions.cs`

- [ ] **Step 1: Replace the CORS block and add authentication/authorization registration**

Replace this block:

```csharp
        // CORS
        services.AddCors(options =>
        {
            options.AddPolicy("Development", policy =>
            {
                policy.AllowAnyOrigin()
                      .AllowAnyMethod()
                      .AllowAnyHeader();
            });
        });

        return services;
```

with:

```csharp
        // CORS — the frontend origin must be named explicitly because
        // cookies require AllowCredentials(), which is incompatible with AllowAnyOrigin()
        services.AddCors(options =>
        {
            options.AddPolicy("Frontend", policy =>
            {
                var allowedOrigin = configuration["Cors:AllowedOrigin"];
                if (string.IsNullOrWhiteSpace(allowedOrigin))
                    return;

                policy.WithOrigins(allowedOrigin)
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .AllowCredentials();
            });
        });

        // Authentication & Authorization — Google sign-in via a server-side cookie session
        services.Configure<AuthOptions>(configuration.GetSection(AuthOptions.SectionName));
        services.AddScoped<IGoogleTokenValidator, GoogleTokenValidator>();
        services.AddScoped<IAuthService, AuthService>();

        services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(options =>
            {
                options.Cookie.Name = "spender_session";
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.ExpireTimeSpan = TimeSpan.FromDays(30);
                options.SlidingExpiration = true;

                // This is an API: return 401/403 instead of redirecting to a login page
                options.Events.OnRedirectToLogin = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    return Task.CompletedTask;
                };
                options.Events.OnRedirectToAccessDenied = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return Task.CompletedTask;
                };
            });

        services.AddAuthorization();

        return services;
```

- [ ] **Step 2: Add the new `using` statements to the top of the file**

Add these alongside the existing `using` statements:

```csharp
using Microsoft.AspNetCore.Authentication.Cookies;
using Spender.Auth;
```

- [ ] **Step 3: Build to confirm it compiles**

Run: `dotnet build Spender.API`
Expected: `Build succeeded.`

- [ ] **Step 4: Commit**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender
git add Spender.API/Extensions/ServiceCollectionExtensions.cs
git commit -m "register cookie authentication, authorization, and credentialed CORS policy"
```

---

### Task 6: Update the request pipeline to use CORS/authentication/authorization

CORS now needs to run in every environment (not just Development), and the
pipeline needs `UseAuthentication`/`UseAuthorization` between routing and
endpoint mapping.

**Files:**
- Modify: `Spender.API/Extensions/WebApplicationExtensions.cs`

- [ ] **Step 1: Replace the middleware configuration block**

Replace:

```csharp
        // Configure middleware
        if (app.Environment.IsDevelopment())
        {
            app.UseCors("Development");
            // OpenAPI JSON: /openapi/v1.json
            app.MapOpenApi();
            // Scalar UI: /scalar
            app.MapScalarApiReference();
        }
```

with:

```csharp
        // Configure middleware
        app.UseCors("Frontend");

        if (app.Environment.IsDevelopment())
        {
            // OpenAPI JSON: /openapi/v1.json
            app.MapOpenApi();
            // Scalar UI: /scalar
            app.MapScalarApiReference();
        }

        app.UseAuthentication();
        app.UseAuthorization();
```

- [ ] **Step 2: Map the new auth endpoints alongside the others**

Replace:

```csharp
        app.MapGet("/", () => "Spender API v1.0");
        app.MapTransactionEndpoints();
```

with:

```csharp
        app.MapGet("/", () => "Spender API v1.0");
        app.MapAuthEndpoints();
        app.MapTransactionEndpoints();
```

- [ ] **Step 3: Build to confirm it compiles**

(This will fail until Task 7 adds `MapAuthEndpoints` — that's expected. Just
confirm the *only* error is the missing method.)

Run: `dotnet build Spender.API`
Expected: error `'WebApplication' does not contain a definition for 'MapAuthEndpoints'`

- [ ] **Step 4: Commit**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender
git add Spender.API/Extensions/WebApplicationExtensions.cs
git commit -m "run CORS in all environments and add authentication/authorization to the pipeline"
```

---

### Task 7: Create `AuthEndpoints`

Three endpoints: sign in with a Google credential (sets the cookie), sign out
(clears it), and "who am I" (used by the frontend to restore sessions).

**Files:**
- Create: `Spender.API/Endpoints/AuthEndpoints.cs`

- [ ] **Step 1: Create `Spender.API/Endpoints/AuthEndpoints.cs`**

```csharp
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
```

- [ ] **Step 2: Build to confirm it compiles**

Run: `dotnet build Spender.API`
Expected: `Build succeeded.`

- [ ] **Step 3: Commit**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender
git add Spender.API/Endpoints/AuthEndpoints.cs
git commit -m "add /api/auth/google, /api/auth/logout, and /api/auth/me endpoints"
```

---

### Task 8: Require authorization on every existing endpoint group

Without this, the cookie session would exist but wouldn't actually protect
any data — anonymous requests would still reach transactions/categories/etc.

**Files:**
- Modify: `Spender.API/Endpoints/TransactionEndpoints.cs:10`
- Modify: `Spender.API/Endpoints/CategoryEndpoints.cs:10`
- Modify: `Spender.API/Endpoints/AnalyticsEndpoints.cs:9`
- Modify: `Spender.API/Endpoints/PeopleEndpoints.cs:11`

- [ ] **Step 1: Add `.RequireAuthorization()` to each group declaration**

In `Spender.API/Endpoints/TransactionEndpoints.cs:10`, change:
```csharp
        var group = app.MapGroup("/api/transactions").WithTags("Transactions");
```
to:
```csharp
        var group = app.MapGroup("/api/transactions").WithTags("Transactions").RequireAuthorization();
```

In `Spender.API/Endpoints/CategoryEndpoints.cs:10`, change:
```csharp
        var group = app.MapGroup("/api/categories").WithTags("Categories");
```
to:
```csharp
        var group = app.MapGroup("/api/categories").WithTags("Categories").RequireAuthorization();
```

In `Spender.API/Endpoints/AnalyticsEndpoints.cs:9`, change:
```csharp
        var group = app.MapGroup("/api/analytics").WithTags("Analytics");
```
to:
```csharp
        var group = app.MapGroup("/api/analytics").WithTags("Analytics").RequireAuthorization();
```

In `Spender.API/Endpoints/PeopleEndpoints.cs:11`, change:
```csharp
        var group = app.MapGroup("/api/people").WithTags("People");
```
to:
```csharp
        var group = app.MapGroup("/api/people").WithTags("People").RequireAuthorization();
```

- [ ] **Step 2: Build to confirm it compiles**

Run: `dotnet build Spender.API`
Expected: `Build succeeded.`

- [ ] **Step 3: Commit**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender
git add Spender.API/Endpoints/TransactionEndpoints.cs Spender.API/Endpoints/CategoryEndpoints.cs Spender.API/Endpoints/AnalyticsEndpoints.cs Spender.API/Endpoints/PeopleEndpoints.cs
git commit -m "require an authenticated session on all existing API endpoint groups"
```

---

### Task 9: Configure local dev settings and verify the backend manually

We add the local CORS origin to `appsettings.Development.json` (the
`GoogleAuth` values stay out of source control — they go into user secrets,
which this project is already set up for via `UserSecretsId`).

**Files:**
- Modify: `Spender.API/appsettings.Development.json`

- [ ] **Step 1: Add the `Cors` section to `appsettings.Development.json`**

Change:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Information"
    }
  },
  "ConnectionStrings": {
    "Default": "Host=localhost;Port=5432;Database=mydb;Username=myuser;Password=mypassword"
  }
}
```
to:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Information"
    }
  },
  "ConnectionStrings": {
    "Default": "Host=localhost;Port=5432;Database=mydb;Username=myuser;Password=mypassword"
  },
  "Cors": {
    "AllowedOrigin": "http://localhost:5173"
  }
}
```

- [ ] **Step 2: Set your Google OAuth values via user secrets**

This is where *your* values go — they must never be committed. Replace the
placeholders with the Client ID and emails from your Google Cloud Console
setup (see "Manual setup" note in the design spec):

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender/Spender.API
dotnet user-secrets set "GoogleAuth:ClientId" "YOUR_CLIENT_ID.apps.googleusercontent.com"
dotnet user-secrets set "GoogleAuth:AllowedEmails" "you@gmail.com,partner@gmail.com"
```

- [ ] **Step 3: Run the API and verify the gate is in place**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender
dotnet run --project Spender.API
```

In another terminal, confirm protected endpoints reject anonymous requests
and that `/api/auth/me` does the same:

```bash
curl -i http://localhost:5020/api/categories
curl -i http://localhost:5020/api/auth/me
```

Expected: both return `HTTP/1.1 401 Unauthorized`.

Then confirm the login endpoint rejects a bogus credential with a typed error:

```bash
curl -i -X POST http://localhost:5020/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"credential":"not-a-real-token"}'
```

Expected: `HTTP/1.1 401 Unauthorized` with body `{"reason":"invalid_token"}`.

(Signing in with a *real* Google credential requires the browser-based flow —
covered in Task 18's end-to-end check, once the frontend exists.)

- [ ] **Step 4: Stop the server and commit**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender
git add Spender.API/appsettings.Development.json
git commit -m "configure local CORS origin for the frontend dev server"
```

---

### Task 10: Wire deployment configuration

Adds the new env vars to `.env.example`, `docker-compose.yml`, the frontend
`Dockerfile` (build arg), and the GitHub Actions deploy workflow — following
the existing pattern used for `DB_PASSWORD`/`API_DOMAIN`/`VITE_API_URL`.

**Files:**
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Modify: `frontend/spender-ui/Dockerfile`
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: Add the new variables to `.env.example`**

Append to the existing file:
```
GOOGLE_CLIENT_ID=changeme.apps.googleusercontent.com
GOOGLE_ALLOWED_EMAILS=you@example.com,partner@example.com
```

- [ ] **Step 2: Pass them through to the API container in `docker-compose.yml`**

In the `api` service's `environment` block, change:
```yaml
    environment:
      ConnectionStrings__Default: Host=postgres;Database=spender;Username=spender;Password=${DB_PASSWORD}
      ASPNETCORE_ENVIRONMENT: Production
```
to:
```yaml
    environment:
      ConnectionStrings__Default: Host=postgres;Database=spender;Username=spender;Password=${DB_PASSWORD}
      ASPNETCORE_ENVIRONMENT: Production
      GoogleAuth__ClientId: ${GOOGLE_CLIENT_ID}
      GoogleAuth__AllowedEmails: ${GOOGLE_ALLOWED_EMAILS}
      Cors__AllowedOrigin: https://${APP_DOMAIN}
```

- [ ] **Step 3: Declare the frontend build-time arg in `frontend/spender-ui/Dockerfile`**

Change:
```dockerfile
# declare build arg
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
```
to:
```dockerfile
# declare build args
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
```

- [ ] **Step 4: Pass the Client ID through the CI build and deploy steps**

In `.github/workflows/deploy.yml`, update the frontend image build step —
change:
```yaml
          build-args: |
            VITE_API_URL=${{ vars.VITE_API_URL }}
```
to:
```yaml
          build-args: |
            VITE_API_URL=${{ vars.VITE_API_URL }}
            VITE_GOOGLE_CLIENT_ID=${{ vars.VITE_GOOGLE_CLIENT_ID }}
```

Then update the deploy step — change:
```yaml
          envs: API_DOMAIN,APP_DOMAIN,API_IMAGE,FRONTEND_IMAGE,DB_PASSWORD
          script: |
            cd ~/spender
            docker compose pull
            docker compose up -d
            docker image prune -f   # clean up old images
        env:
          API_DOMAIN: ${{ vars.API_DOMAIN }}
          APP_DOMAIN: ${{ vars.APP_DOMAIN }}
          API_IMAGE: ghcr.io/${{ vars.OWNER  }}/spender-api:latest
          FRONTEND_IMAGE: ghcr.io/${{ vars.OWNER  }}/spender-frontend:latest
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }} # only this needs to be a secret
```
to:
```yaml
          envs: API_DOMAIN,APP_DOMAIN,API_IMAGE,FRONTEND_IMAGE,DB_PASSWORD,GOOGLE_CLIENT_ID,GOOGLE_ALLOWED_EMAILS
          script: |
            cd ~/spender
            docker compose pull
            docker compose up -d
            docker image prune -f   # clean up old images
        env:
          API_DOMAIN: ${{ vars.API_DOMAIN }}
          APP_DOMAIN: ${{ vars.APP_DOMAIN }}
          API_IMAGE: ghcr.io/${{ vars.OWNER  }}/spender-api:latest
          FRONTEND_IMAGE: ghcr.io/${{ vars.OWNER  }}/spender-frontend:latest
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }} # only this needs to be a secret
          GOOGLE_CLIENT_ID: ${{ vars.GOOGLE_CLIENT_ID }} # not secret — it ends up in the public frontend bundle anyway
          GOOGLE_ALLOWED_EMAILS: ${{ secrets.GOOGLE_ALLOWED_EMAILS }}
```

- [ ] **Step 5: Commit**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender
git add .env.example docker-compose.yml frontend/spender-ui/Dockerfile .github/workflows/deploy.yml
git commit -m "wire Google login config through docker-compose, Dockerfile, and CI deploy"
```

> **Note for you (not a plan step):** before this works in production you'll
> need to add `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` as repo **variables**,
> and `GOOGLE_ALLOWED_EMAILS` as a repo **secret**, in GitHub Actions settings —
> matching how `OWNER`/`API_DOMAIN` (vars) and `DB_PASSWORD` (secret) are set up.

---

## Part C — Frontend: Login page & route gate

### Task 11: Regenerate the Orval API client to include the new auth endpoints

The frontend's API layer is fully generated from `Spender.API`'s build-time
OpenAPI spec (see `orval.config.ts` — "never edit by hand"). Now that
`AuthEndpoints` exists with `WithName(...)`/`Produces<T>()` annotations,
regenerating will produce typed React Query hooks (`useGoogleLogin`,
`useLogout`, `useGetCurrentUser`) alongside the existing generated hooks.

**Files:**
- Generated (do not hand-edit): `frontend/spender-ui/src/api/generated/auth/auth.ts`
- Generated (do not hand-edit): new files under `frontend/spender-ui/src/api/model/`

- [ ] **Step 1: Regenerate the client**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender/frontend/spender-ui
pnpm generate
```

- [ ] **Step 2: Confirm the new generated files exist and the project type-checks**

```bash
ls src/api/generated/auth/
npx tsc -b --noEmit
```

Expected: `auth.ts` is listed, and `tsc` produces no output (no errors).

- [ ] **Step 3: Commit the regenerated client**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender
git add frontend/spender-ui/src/api
git commit -m "regenerate Orval API client to include /api/auth endpoints"
```

---

### Task 12: Add `@react-oauth/google` and update `customFetch` for cookie sessions

Two changes to the shared fetch layer: send cookies on every request
(`credentials: 'include'`), and broadcast a browser event when a request comes
back `401` so `AuthContext` (Task 13) can react without `mutator.ts` needing
to know about routing.

**Files:**
- Modify: `frontend/spender-ui/package.json`
- Modify: `frontend/spender-ui/src/api/mutator.ts`

- [ ] **Step 1: Add the dependency**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender/frontend/spender-ui
pnpm add @react-oauth/google
```

- [ ] **Step 2: Update `customFetch` in `frontend/spender-ui/src/api/mutator.ts`**

Replace the whole file with:

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5020';

export const UNAUTHORIZED_EVENT = 'spender:unauthorized';

export const customFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${url}`, {
    credentials: 'include',
    ...options,
  });

  if (response.status === 401) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `HTTP ${response.status}`);
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = response.status === 204 || !isJson ? undefined : await response.json();

  return { data, status: response.status, headers: response.headers } as T;
};
```

- [ ] **Step 3: Type-check and commit**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender/frontend/spender-ui
npx tsc -b --noEmit
cd /mnt/c/Users/Gazs/source/repos/Spender
git add frontend/spender-ui/package.json frontend/spender-ui/pnpm-lock.yaml frontend/spender-ui/src/api/mutator.ts
git commit -m "send credentials on every API request and broadcast a 401 event"
```

---

### Task 13: Create `AuthContext`

Holds the signed-in user, restores the session on load via the generated
`useGetCurrentUser` hook, and listens for the `UNAUTHORIZED_EVENT` broadcast
from `customFetch` so any 401 anywhere clears the session.

**Files:**
- Create: `frontend/spender-ui/src/auth/AuthContext.tsx`

> Before writing this file, check the exact exported names in
> `frontend/spender-ui/src/api/generated/auth/auth.ts` — Orval names hooks after
> the endpoint's `WithName(...)` value (e.g. `GetCurrentUser` → `useGetCurrentUser`,
> `GoogleLogin` → `useGoogleLogin`, `Logout` → `useLogout`). Adjust the import
> names below if the generator produced different casing.

- [ ] **Step 1: Create `frontend/spender-ui/src/auth/AuthContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetCurrentUser,
  useGoogleLogin,
  useLogout,
  getGetCurrentUserQueryKey,
} from '../api/generated/auth/auth';
import type { AuthUserResponse } from '../api/model';
import { UNAUTHORIZED_EVENT } from '../api/mutator';

interface AuthContextValue {
  user: AuthUserResponse | undefined;
  isLoading: boolean;
  signIn: (credential: string) => Promise<AuthUserResponse>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [signedOut, setSignedOut] = useState(false);

  const me = useGetCurrentUser({ query: { retry: false } });
  const loginMutation = useGoogleLogin();
  const logoutMutation = useLogout();

  useEffect(() => {
    const handleUnauthorized = () => setSignedOut(true);
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const user = signedOut ? undefined : me.data?.data;

  const signIn = async (credential: string) => {
    const response = await loginMutation.mutateAsync({ data: { credential } });
    setSignedOut(false);
    queryClient.setQueryData(getGetCurrentUserQueryKey(), response);
    return response.data;
  };

  const signOut = async () => {
    await logoutMutation.mutateAsync();
    setSignedOut(true);
    queryClient.removeQueries({ queryKey: getGetCurrentUserQueryKey() });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading: me.isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

- [ ] **Step 2: Type-check**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender/frontend/spender-ui
npx tsc -b --noEmit
```

Expected: no errors. If the generated hook names differ from
`useGetCurrentUser`/`useGoogleLogin`/`useLogout`/`getGetCurrentUserQueryKey`,
fix the imports to match what `auth.ts` actually exports and re-run.

- [ ] **Step 3: Commit**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender
git add frontend/spender-ui/src/auth
git commit -m "add AuthContext restoring sessions via /api/auth/me and reacting to 401s"
```

---

### Task 14: Create `LoginPage`

Renders Google's official Sign-In button (via `@react-oauth/google`), exchanges
the resulting credential for a session through `AuthContext.signIn`, and shows
a clear message when the account isn't on the allowlist.

**Files:**
- Create: `frontend/spender-ui/src/pages/login/LoginPage.tsx`
- Create: `frontend/spender-ui/src/pages/login/LoginPage.module.css`

- [ ] **Step 1: Create `frontend/spender-ui/src/pages/login/LoginPage.module.css`**

```css
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 40px;
  width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
}

.brand {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
}

.subtitle {
  color: var(--text-muted);
  font-size: 13.5px;
}

.error {
  color: var(--danger);
  font-size: 13px;
}
```

- [ ] **Step 2: Create `frontend/spender-ui/src/pages/login/LoginPage.tsx`**

```tsx
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../../auth/AuthContext';
import styles from './LoginPage.module.css';

const ERROR_MESSAGES: Record<string, string> = {
  email_not_allowed: "This Google account isn't authorized to use this app.",
  invalid_token: 'Sign-in failed. Please try again.',
};

export default function LoginPage() {
  const { user, isLoading, signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    setError(null);
    if (!credentialResponse.credential) {
      setError(ERROR_MESSAGES.invalid_token);
      return;
    }

    try {
      await signIn(credentialResponse.credential);
    } catch (err) {
      const reason = err instanceof Error ? err.message : '';
      setError(ERROR_MESSAGES[reason] ?? ERROR_MESSAGES.invalid_token);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>Spender</div>
        <p className={styles.subtitle}>Sign in with Google to continue</p>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => setError(ERROR_MESSAGES.invalid_token)}
        />
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
```

> Note: `customFetch` throws `Error(text)` where `text` is the raw response
> body. The backend's 401 body is JSON (`{"reason":"email_not_allowed"}`), so
> `err.message` will be that JSON string, not the bare `reason`. Parse it:

- [ ] **Step 3: Parse the error body so the right message shows**

In `LoginPage.tsx`, replace the `catch` block:
```tsx
    } catch (err) {
      const reason = err instanceof Error ? err.message : '';
      setError(ERROR_MESSAGES[reason] ?? ERROR_MESSAGES.invalid_token);
    }
```
with:
```tsx
    } catch (err) {
      let reason = '';
      if (err instanceof Error) {
        try {
          reason = (JSON.parse(err.message) as { reason?: string }).reason ?? '';
        } catch {
          reason = '';
        }
      }
      setError(ERROR_MESSAGES[reason] ?? ERROR_MESSAGES.invalid_token);
    }
```

- [ ] **Step 4: Type-check and commit**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender/frontend/spender-ui
npx tsc -b --noEmit
cd /mnt/c/Users/Gazs/source/repos/Spender
git add frontend/spender-ui/src/pages/login
git commit -m "add LoginPage with Google Sign-In button and allowlist error messaging"
```

---

### Task 15: Wire `GoogleOAuthProvider`, `AuthProvider`, and route guarding into `App.tsx`

Wraps the app in the OAuth provider (needs `VITE_GOOGLE_CLIENT_ID`) and the
`AuthProvider`, adds the `/login` route, and gates the existing `Shell` routes
behind an authenticated session.

**Files:**
- Modify: `frontend/spender-ui/src/App.tsx`

- [ ] **Step 1: Replace the contents of `frontend/spender-ui/src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Shell from './components/layout/Shell';
import LoginPage from './pages/login/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import TransactionsPage from './pages/transactions/TransactionsPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import DebtPage from './pages/debt/DebtPage';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function RequireAuth() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<Shell />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/debt"      element={<DebtPage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender/frontend/spender-ui
npx tsc -b --noEmit
cd /mnt/c/Users/Gazs/source/repos/Spender
git add frontend/spender-ui/src/App.tsx
git commit -m "gate app routes behind an authenticated session and add /login route"
```

---

### Task 16: Add user info and a logout control to `Shell`

**Files:**
- Modify: `frontend/spender-ui/src/components/layout/Shell.tsx`
- Modify: `frontend/spender-ui/src/components/layout/Shell.module.css`

- [ ] **Step 1: Add a user/logout block to `Shell.tsx`**

Change the imports at the top from:
```tsx
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Tag, BarChart2, Scale } from 'lucide-react';
import styles from './Shell.module.css';
```
to:
```tsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Tag, BarChart2, Scale, LogOut } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import styles from './Shell.module.css';
```

Change the component body from:
```tsx
export default function Shell() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>Spender</div>
        <nav className={styles.nav}>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.active : ''}`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
```
to:
```tsx
export default function Shell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>Spender</div>
        <nav className={styles.nav}>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.active : ''}`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        {user && (
          <div className={styles.account}>
            <div className={styles.accountName}>{user.name}</div>
            <div className={styles.accountEmail}>{user.email}</div>
            <button className={styles.logout} onClick={handleLogout}>
              <LogOut size={14} />
              Log out
            </button>
          </div>
        )}
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Add the matching styles to `Shell.module.css`**

Append to the end of the file:
```css
.account {
  margin-top: auto;
  padding: 16px 20px 0;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.accountName {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.accountEmail {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout {
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 12.5px;
  padding: 6px 0;
}
.logout:hover { color: var(--text); }
```

> Note: `.sidebar` is `display: flex; flex-direction: column;` already, so
> `margin-top: auto` on `.account` pushes it to the bottom of the sidebar.

- [ ] **Step 3: Type-check and commit**

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender/frontend/spender-ui
npx tsc -b --noEmit
cd /mnt/c/Users/Gazs/source/repos/Spender
git add frontend/spender-ui/src/components/layout/Shell.tsx frontend/spender-ui/src/components/layout/Shell.module.css
git commit -m "show signed-in user and a logout control in the sidebar"
```

---

### Task 17: Configure the frontend dev environment and run the end-to-end flow

**Files:**
- Create: `frontend/spender-ui/.env.local` (gitignored — local only)

- [ ] **Step 1: Add your Google Client ID for local dev**

Create `frontend/spender-ui/.env.local` (verify `.env*` is gitignored first —
if not, add it to `.gitignore` before creating this file, since it will hold
your real Client ID):

```bash
cd /mnt/c/Users/Gazs/source/repos/Spender/frontend/spender-ui
grep -q '^\.env' .gitignore 2>/dev/null || echo ".env*" >> .gitignore
echo "VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com" > .env.local
```

> This requires the OAuth Client ID from Google Cloud Console (see "Manual
> setup" in the design spec) to have `http://localhost:5173` registered as an
> authorized JavaScript origin.

- [ ] **Step 2: Run both servers**

Terminal 1:
```bash
cd /mnt/c/Users/Gazs/source/repos/Spender
dotnet run --project Spender.API
```

Terminal 2:
```bash
cd /mnt/c/Users/Gazs/source/repos/Spender/frontend/spender-ui
pnpm dev
```

- [ ] **Step 3: Walk through the flow in a browser at `http://localhost:5173`**

Verify each of these manually:
- Visiting `/` redirects to `/login` (no session yet)
- The Google Sign-In button renders
- Signing in with an **allowlisted** account redirects to `/dashboard`, and
  the sidebar shows your name/email
- Reloading the page keeps you signed in (session restored via `/api/auth/me`)
- Clicking "Log out" returns you to `/login`, and reloading `/dashboard`
  afterwards redirects back to `/login`
- Signing in with a **non-allowlisted** Google account shows "This Google
  account isn't authorized to use this app." and does not grant access

- [ ] **Step 4: Stop both servers — nothing to commit (`.env.local` is gitignored)**

If `.gitignore` was changed in Step 1, commit just that:
```bash
cd /mnt/c/Users/Gazs/source/repos/Spender
git add .gitignore
git commit -m "ignore local env files"
```
(Skip this commit if `.env*` was already ignored.)

---

## Self-review notes

- **Spec coverage:** Task 1–4 cover `Spender.Auth` (validation + allowlist,
  TDD'd); Tasks 5–8 cover cookie auth, CORS, `/api/auth/*` endpoints, and
  protecting existing endpoints; Task 9 covers local config + manual backend
  verification; Task 10 covers deployment config; Tasks 11–16 cover the
  frontend (regenerated client, `customFetch` cookie/401 handling,
  `AuthContext`, `LoginPage`, route guarding, `Shell` user info/logout); Task
  17 is the full end-to-end walkthrough from the spec's manual testing section.
- **Type consistency:** `AuthenticatedUser`/`AuthUserResponse`/`AuthErrorResponse`
  are used consistently across `AuthService` → `AuthEndpoints` → generated
  client → `AuthContext` → `LoginPage`/`Shell`. `UNAUTHORIZED_EVENT` is defined
  once in `mutator.ts` and consumed only in `AuthContext`.
