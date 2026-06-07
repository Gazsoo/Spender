import { useQueryClient } from '@tanstack/react-query';
import type { MutateOptions } from '@tanstack/react-query';
import {
  useGetCategories,
  useCreateCategory as _useCreateCategory,
  useUpdateCategory as _useUpdateCategory,
  useDeleteCategory as _useDeleteCategory,
  getGetCategoriesQueryKey,
} from '../api/generated/categories/categories';
import type { CreateCategoryRequest, UpdateCategoryRequest } from '../api/model';

export function useCategories() {
  const q = useGetCategories();
  return { ...q, data: q.data?.data };
}

export function useCreateCategory() {
  const qc = useQueryClient();
  const m = _useCreateCategory({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getGetCategoriesQueryKey() }) },
  });
  return {
    ...m,
    mutate: (
      data: CreateCategoryRequest,
      options?: MutateOptions<Awaited<ReturnType<typeof m.mutateAsync>>, unknown, { data: CreateCategoryRequest }>,
    ) => m.mutate({ data }, options),
  };
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  const m = _useUpdateCategory({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getGetCategoriesQueryKey() }) },
  });
  return {
    ...m,
    mutate: (
      vars: { id: number; data: UpdateCategoryRequest },
      options?: MutateOptions<Awaited<ReturnType<typeof m.mutateAsync>>, unknown, { id: number; data: UpdateCategoryRequest }>,
    ) => m.mutate(vars, options),
  };
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  const m = _useDeleteCategory({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getGetCategoriesQueryKey() }) },
  });
  return {
    ...m,
    mutate: (
      id: number,
      options?: MutateOptions<Awaited<ReturnType<typeof m.mutateAsync>>, unknown, { id: number }>,
    ) => m.mutate({ id }, options),
  };
}
