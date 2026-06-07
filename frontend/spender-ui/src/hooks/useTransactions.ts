import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionApi } from '../services/api';
import type { CreateTransactionRequest, UpdateTransactionRequest } from '../types';

const QUERY_KEY = ['transactions'] as const;

export function useTransactions() {
  return useQuery({ queryKey: QUERY_KEY, queryFn: transactionApi.getAll });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransactionRequest) => transactionApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTransactionRequest }) =>
      transactionApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => transactionApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
