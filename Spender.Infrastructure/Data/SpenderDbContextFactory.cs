using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Spender.Infrastructure.Data;

public class SpenderDbContextFactory : IDesignTimeDbContextFactory<SpenderDbContext>
{
    public SpenderDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<SpenderDbContext>();
        optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=mydb;Username=myuser;Password=mypassword");

        return new SpenderDbContext(optionsBuilder.Options);
    }
}
