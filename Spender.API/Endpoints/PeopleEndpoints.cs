using Microsoft.EntityFrameworkCore;
using Spender.Infrastructure.Data;
using Spender.Shared.Models;

namespace Spender.API.Endpoints;

public static class PeopleEndpoints
{
    public static void MapPeopleEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/people").WithTags("People");

        group.MapGet("/", async (SpenderDbContext db) =>
        {
            var people = await db.People.OrderBy(p => p.Name).ToListAsync();
            return Results.Ok(people);
        })
        .WithName("GetPeople")
        .Produces<IEnumerable<Person>>();
    }
}
