import { useQueryClient } from '@tanstack/react-query';
import type { MutateOptions } from '@tanstack/react-query';
import {
  useGetTransactions,
  useCreateTransaction as _useCreateTransaction,
  useUpdateTransaction as _useUpdateTransaction,
  useDeleteTransaction as _useDeleteTransaction,
  getGetTransactionsQueryKey,
} from '../api/generated/transactions/transactions';
import type {
  CreateTransactionRequest,
  UpdateTransactionRequest,
  Transaction,
} from '../api/model';

export function useTransactions() {
  const q = useGetTransactions();
  return { ...q, data: q.data?.data };
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  const m = _useCreateTransaction({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getGetTransactionsQueryKey() }) },
  });
  return {
    ...m,
    mutate: (
      data: CreateTransactionRequest,
      options?: MutateOptions<Awaited<ReturnType<typeof m.mutateAsync>>, unknown, { data: CreateTransactionRequest }>,
    ) => m.mutate({ data }, options),
  };
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  const m = _useUpdateTransaction({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getGetTransactionsQueryKey() }) },
  });
  return {
    ...m,
    mutate: (
      vars: { id: number; data: UpdateTransactionRequest },
      options?: MutateOptions<Awaited<ReturnType<typeof m.mutateAsync>>, unknown, { id: number; data: UpdateTransactionRequest }>,
    ) => m.mutate(vars, options),
  };
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  const m = _useDeleteTransaction({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getGetTransactionsQueryKey() }) },
  });
  return {
    ...m,
    mutate: (
      id: number,
      options?: MutateOptions<Awaited<ReturnType<typeof m.mutateAsync>>, unknown, { id: number }>,
    ) => m.mutate({ id }, options),
  };
}

export type { Transaction };
