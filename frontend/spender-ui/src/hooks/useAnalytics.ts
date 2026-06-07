import {
  useGetMonthlyAnalytics,
  useGetYearlyAnalytics,
  useGetDebtSummary,
} from '../api/generated/analytics/analytics';

export function useMonthlyAnalytics(year?: number, month?: number) {
  const q = useGetMonthlyAnalytics({ year, month });
  return { ...q, data: q.data?.data };
}

export function useYearlyAnalytics(year?: number) {
  const q = useGetYearlyAnalytics({ year });
  return { ...q, data: q.data?.data };
}

export function useDebtSummary(perspectiveId: number, from?: string, to?: string) {
  const q = useGetDebtSummary(
    { perspectiveId, ...(from && { from }), ...(to && { to }) },
    { query: { enabled: perspectiveId > 0 } },
  );
  return { ...q, data: q.data?.data };
}
