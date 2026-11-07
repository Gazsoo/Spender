namespace Spender.Home.Services;

public interface IHomeDashboardService
{
    Task<HomeDashboardResponse> GetDashboardAsync(CancellationToken ct = default);
}
