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
