namespace Spender.Shared.Common;

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Error { get; set; }
    public List<string> ValidationErrors { get; set; } = [];

    public static ApiResponse<T> SuccessResult(T data)
    {
        return new ApiResponse<T>
        {
            Success = true,
            Data = data
        };
    }

    public static ApiResponse<T> ErrorResult(string error)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Error = error
        };
    }

    public static ApiResponse<T> ValidationErrorResult(List<string> validationErrors)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Error = "Validation failed",
            ValidationErrors = validationErrors
        };
    }
}