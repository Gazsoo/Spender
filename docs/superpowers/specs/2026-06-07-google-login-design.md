# Google Login Gate — Design

## Purpose

Spender currently has no authentication — the API and frontend are wide open. This
feature adds a **shared-login gate**: a small trusted circle (you, possibly a
partner) signs in with their Google account, and the app checks their email
against a fixed allowlist before granting access. This is *not* a multi-user
system — `Person` remains a label for splitting expenses, unrelated to login
identity. Everyone who passes the gate sees the same shared finances.

## Goals

- Keep the app private from the open internet without building real user accounts.
- Use Google Identity Services so users authenticate with an account they already have.
- Keep sessions server-side (cookies), avoiding token-handling complexity on the frontend.

## Non-goals

- Per-user data ownership, roles, or permissions.
- Mapping Google identities to `Person` records.
- Self-service signup — the allowlist is the only way in, configured by the operator.

## Architecture

### Backend

**`Spender.Auth`** (currently an empty scaffold project) gains the validation logic,
following the existing domain-service pattern (`ITransactionService` / `TransactionService`):

- `IAuthService` / `AuthService`:
  - Validates a Google ID token using `Google.Apis.Auth`'s
    `GoogleJsonWebSignature.ValidateAsync`, checking the token's `aud` claim
    against the configured Google Client ID.
  - Checks the resulting verified email against a configured allowlist
    (case-insensitive comparison).
  - Returns the verified user info (email, name) or a failure reason.

**`Spender.API`** wires up ASP.NET Core cookie authentication and exposes new
`AuthEndpoints` (alongside `TransactionEndpoints`, `CategoryEndpoints`, etc.):

- `AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(...)`
  configured with `HttpOnly = true`, `SecurePolicy = Always`, `SameSite = Lax`.
- `POST /api/auth/google` — body `{ credential: string }` (the Google ID token JWT).
  Calls `AuthService`; on success, builds a `ClaimsPrincipal` (email + name claims)
  and calls `HttpContext.SignInAsync`, setting the session cookie. Returns the
  user info as JSON. On failure (invalid token or email not allowlisted), returns
  `401 Unauthorized`.
- `POST /api/auth/logout` — calls `HttpContext.SignOutAsync`, clearing the cookie.
- `GET /api/auth/me` — returns `{ email, name }` for the current authenticated
  user, or `401` if not authenticated. Used by the frontend to restore session
  state on page load/refresh.

All existing endpoint groups (`TransactionEndpoints`, `CategoryEndpoints`,
`AnalyticsEndpoints`, `PeopleEndpoints`) get `.RequireAuthorization()` applied to
their route groups, so any request without a valid session cookie gets `401`.

**Configuration** (added to `appsettings.json` / environment, mirroring the
existing `DB_PASSWORD`-style pattern):
- `GoogleAuth:ClientId` — the OAuth Client ID from Google Cloud Console; used to
  validate the token audience.
- `GoogleAuth:AllowedEmails` — array/comma-separated list of approved emails.

### Frontend

- **`LoginPage`** (new page under `pages/login/`) renders Google's official
  Sign-In button via the `@react-oauth/google` library. The app root wraps
  routes in `GoogleOAuthProvider` configured with `VITE_GOOGLE_CLIENT_ID`.
  On a successful Google sign-in, the page receives an ID token ("credential")
  and POSTs it to `/api/auth/google` with `credentials: 'include'`.
- **`AuthContext` / `useAuth`** (new, under `hooks/` or a new `auth/` folder):
  on mount, calls `GET /api/auth/me` to discover an existing session. Exposes
  `{ user, isLoading, login(credential), logout() }` via context to the rest
  of the app.
- **Route guarding** in `App.tsx`: a wrapper around the existing `<Shell>` route
  tree that, while the auth check is loading, shows a loading state; if there's
  no authenticated user, redirects to `/login`; otherwise renders the protected
  routes as today. `/login` itself redirects to `/dashboard` if a session already
  exists.
- **`services/api.ts`**: `fetchApi` adds `credentials: 'include'` to every
  request so the session cookie is sent. A `401` response triggers a redirect
  to `/login` (covers session expiry mid-use).
- **`Shell`**: sidebar gains a small block at the bottom showing the signed-in
  user's name/email and a "Log out" action wired to `logout()`.

## Data flow

```
1. User opens the app → AuthContext calls GET /api/auth/me
2a. No session  → redirected to /login
2b. Has session → app renders normally

Login:
1. User clicks Google's Sign-In button on /login
2. Google returns an ID token (credential) to the browser
3. Frontend POSTs { credential } to /api/auth/google (credentials: 'include')
4. AuthService validates the token signature/audience via Google's library,
   then checks the email against the allowlist
5a. Valid + allowlisted → API sets HttpOnly session cookie, returns user info;
    frontend stores user in AuthContext and navigates to /dashboard
5b. Invalid or not allowlisted → API returns 401; frontend shows an error
    ("This Google account isn't authorized to use this app")

Logout:
1. User clicks "Log out" → POST /api/auth/logout (clears cookie)
2. AuthContext clears user state → redirected to /login
```

## Cross-cutting concerns

### CORS

The current `Development` CORS policy uses `AllowAnyOrigin()`, which cannot be
combined with `AllowCredentials()` (required for cookies to flow cross-origin).
This will be replaced with a policy naming explicit origins —
`http://localhost:5173` for local dev, `APP_DOMAIN` (existing CI
variable) for production — combined with `.AllowCredentials()`.

### Cookies

Frontend and API are deployed as sibling subdomains of the same parent domain
in production (e.g. `app.example.com` / `api.example.com`), confirmed by the
user — so `SameSite=Lax` is sufficient (no need for `SameSite=None`). Cookies
are always `Secure` (the whole stack sits behind Caddy's automatic HTTPS).

### Configuration additions

| Where | Variable | Purpose |
|---|---|---|
| Backend (env/appsettings) | `GOOGLE_CLIENT_ID` | Validates ID token audience |
| Backend (env/appsettings) | `GOOGLE_ALLOWED_EMAILS` | Comma-separated allowlist |
| Frontend (build-time) | `VITE_GOOGLE_CLIENT_ID` | Renders the Google button, must match backend Client ID |

These need to be added to `.env.example`, `docker-compose.yml`, and the GitHub
Actions deploy workflow (secrets/variables), matching the existing pattern used
for `DB_PASSWORD` / `API_DOMAIN` / `APP_DOMAIN`.

### Manual setup required (outside this codebase)

Before this can work end-to-end, the operator needs to:
1. Create a Google Cloud project and configure the OAuth consent screen.
2. Create an OAuth 2.0 Client ID (type: Web application).
3. Register authorized JavaScript origins: `http://localhost:5173` (dev) and
   the production `APP_DOMAIN` (e.g. `https://app.example.com`).
4. Note the resulting Client ID for use as both `GOOGLE_CLIENT_ID` (backend)
   and `VITE_GOOGLE_CLIENT_ID` (frontend).

## Error handling

- **Invalid/expired Google token**: `AuthService` returns failure → `401` from
  `/api/auth/google` → frontend shows a generic "Sign-in failed, please try
  again" message.
- **Valid Google account, not on allowlist**: same `401` path, but with a
  distinct message: "This Google account isn't authorized to use this app."
  (The API distinguishes these via a reason code in the response body so the
  frontend can show the right copy; it does not leak which emails *are* allowed.)
- **Session expires / cookie cleared mid-use**: any API call returns `401` →
  `fetchApi` redirects to `/login`.
- **Google script fails to load** (e.g. network/ad-blocker): the Sign-In button
  area shows a fallback message rather than staying blank.

## Testing approach

- Backend: unit tests for `AuthService` covering token validation success/failure
  and allowlist matching (mocking the Google validation call).
- Backend: integration-style tests for `/api/auth/*` endpoints verifying cookie
  is set on success, cleared on logout, and protected endpoints reject
  unauthenticated requests with `401`.
- Frontend: component tests for `LoginPage` (renders button, handles
  success/failure), `AuthContext` (restores session from `/me`, handles
  logout), and route guarding (redirects appropriately based on auth state).
- Manual: full sign-in/sign-out flow in a browser against the local API, plus
  verifying an unallowlisted Google account is rejected.
