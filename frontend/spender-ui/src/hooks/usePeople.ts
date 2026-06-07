import { useQuery } from '@tanstack/react-query';
import { personApi } from '../services/api';

export function usePeople() {
  return useQuery({ queryKey: ['people'], queryFn: personApi.getAll });
}
