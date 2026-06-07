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
