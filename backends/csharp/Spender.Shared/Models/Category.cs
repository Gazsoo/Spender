using System.Text.Json.Serialization;

namespace Spender.Shared.Models;

public class Category
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Color { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public ICollection<Transaction> Transactions { get; set; } = [];
}