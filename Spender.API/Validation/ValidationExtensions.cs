namespace Spender.API.Validation;

public static class ValidationExtensions
{
    public static string RequiredString(this string? value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException($"{fieldName} is required");
        return value.Trim();
    }

    public static decimal PositiveAmount(this decimal value, string fieldName = "Amount")
    {
        if (value <= 0)
            throw new ArgumentException($"{fieldName} must be greater than 0");
        return value;
    }

    public static string ValidateColorCode(this string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        value = value.Trim();
        if (!value.StartsWith('#') || (value.Length != 4 && value.Length != 7))
            throw new ArgumentException("Color must be a valid hex color code (e.g., #FF6B6B or #F6B)");

        return value;
    }
}