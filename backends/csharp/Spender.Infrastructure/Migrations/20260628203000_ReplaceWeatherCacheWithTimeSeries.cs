using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Spender.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceWeatherCacheWithTimeSeries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WeatherCache");

            migrationBuilder.CreateTable(
                name: "WeatherReadings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Source = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    FetchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Temperature = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    FeelsLike = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    Humidity = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    Pressure = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    WindSpeed = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    WindDirection = table.Column<int>(type: "integer", nullable: true),
                    StationName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ObservedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    WeatherCode = table.Column<int>(type: "integer", nullable: true),
                    ForecastJson = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeatherReadings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WeatherReadings_Source_FetchedAt",
                table: "WeatherReadings",
                columns: new[] { "Source", "FetchedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WeatherReadings");

            migrationBuilder.CreateTable(
                name: "WeatherCache",
                columns: table => new
                {
                    Source = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    FetchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Payload = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeatherCache", x => x.Source);
                });
        }
    }
}
