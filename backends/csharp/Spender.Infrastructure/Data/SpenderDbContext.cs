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
    public DbSet<SensorReading> SensorReadings { get; set; }
    public DbSet<WeatherReading> WeatherReadings { get; set; }

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

        modelBuilder.Entity<SensorReading>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Temperature).HasPrecision(6, 2);
            entity.Property(e => e.TemperatureCompensated).HasPrecision(6, 2);
            entity.Property(e => e.Humidity).HasPrecision(6, 2);
            entity.Property(e => e.Pressure).HasPrecision(8, 2);
            entity.Property(e => e.DewPoint).HasPrecision(6, 2);
            entity.Property(e => e.FeelsLike).HasPrecision(6, 2);
            entity.Property(e => e.CpuTemperature).HasPrecision(6, 2);
            entity.Property(e => e.TemperatureSource).HasMaxLength(20);
            entity.HasIndex(e => e.RecordedAt);
        });

        modelBuilder.Entity<WeatherReading>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Source).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Temperature).HasPrecision(6, 2);
            entity.Property(e => e.FeelsLike).HasPrecision(6, 2);
            entity.Property(e => e.Humidity).HasPrecision(6, 2);
            entity.Property(e => e.Pressure).HasPrecision(8, 2);
            entity.Property(e => e.WindSpeed).HasPrecision(6, 2);
            entity.Property(e => e.StationName).HasMaxLength(100);
            entity.Property(e => e.ForecastJson).HasColumnType("text");
            entity.HasIndex(e => new { e.Source, e.FetchedAt });
        });
    }
}
