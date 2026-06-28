import { useGetHome } from '../api/generated/home/home';

export function useHome() {
  const q = useGetHome({ query: { refetchInterval: 30_000, staleTime: 25_000 } });
  return { ...q, data: q.data?.data };
}
