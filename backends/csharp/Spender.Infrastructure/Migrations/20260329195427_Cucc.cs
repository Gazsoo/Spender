using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Spender.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Cucc : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "People",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "People",
                keyColumn: "Id",
                keyValue: 2);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Categories",
                columns: new[] { "Id", "Color", "CreatedAt", "Name" },
                values: new object[,]
                {
                    { 1, "#FF6B6B", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Food & Dining" },
                    { 2, "#4ECDC4", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Transportation" },
                    { 3, "#45B7D1", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Shopping" },
                    { 4, "#96CEB4", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Entertainment" },
                    { 5, "#FFEAA7", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Bills & Utilities" },
                    { 6, "#DDA0DD", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Healthcare" },
                    { 7, "#95A5A6", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Other" }
                });

            migrationBuilder.InsertData(
                table: "People",
                columns: new[] { "Id", "Name" },
                values: new object[,]
                {
                    { 1, "Kata" },
                    { 2, "Gazsi" }
                });
        }
    }
}
