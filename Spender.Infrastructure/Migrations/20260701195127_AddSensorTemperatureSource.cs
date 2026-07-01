using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Spender.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSensorTemperatureSource : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TemperatureSource",
                table: "SensorReadings",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TemperatureSource",
                table: "SensorReadings");
        }
    }
}
