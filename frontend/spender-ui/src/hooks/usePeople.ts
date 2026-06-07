import { useGetPeople } from '../api/generated/people/people';

export function usePeople() {
  const q = useGetPeople();
  return { ...q, data: q.data?.data };
}
