namespace Spender.Shared.DTOs;

public class CreateCategoryRequest
{
    public required string Name { get; set; }
    public string? Color { get; set; }
}

public class UpdateCategoryRequest
{
    public required string Name { get; set; }
    public string? Color { get; set; }
}