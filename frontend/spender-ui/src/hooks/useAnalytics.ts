import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../services/api';

export function useMonthlyAnalytics(year?: number, month?: number) {
  return useQuery({
    queryKey: ['analytics', 'monthly', year, month],
    queryFn: () => analyticsApi.getMonthlySummary(year, month),
  });
}

export function useYearlyAnalytics(year?: number) {
  return useQuery({
    queryKey: ['analytics', 'yearly', year],
    queryFn: () => analyticsApi.getYearlySummary(year),
  });
}

export function useDebtSummary(perspectiveId: number, from?: string, to?: string) {
  return useQuery({
    queryKey: ['analytics', 'debt', perspectiveId, from, to],
    queryFn:  () => analyticsApi.getDebtSummary(perspectiveId, from, to),
    enabled:  perspectiveId > 0,
  });
}
