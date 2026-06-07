using Microsoft.EntityFrameworkCore;
using Spender.Shared.Models;

namespace Spender.Infrastructure.Data;

public class SpenderDbContext : DbContext
{
    public SpenderDbContext(DbContextOptions<SpenderDbContext> options) : base(options)
    {
    }

    public DbSet<Category> Categories { get; set; }
    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<Person> People { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Person>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Color).HasMaxLength(7);
            entity.HasIndex(e => e.Name).IsUnique();
        });

        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(500);

            entity.HasOne(e => e.Category)
                  .WithMany(e => e.Transactions)
                  .HasForeignKey(e => e.CategoryId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.Property(e => e.ExpenseType).HasConversion<int>().HasDefaultValue(ExpenseType.Personal);

            entity.HasOne(e => e.PaidBy)
                  .WithMany()
                  .HasForeignKey(e => e.PaidById)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.FundedBy)
                  .WithMany()
                  .HasForeignKey(e => e.FundedById)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.Date);
            entity.HasIndex(e => e.CategoryId);
        });
    }
}
