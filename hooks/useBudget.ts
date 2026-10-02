import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BudgetService } from '@/services/budget.service';
import { QUERY_KEYS } from '@/constants/api';
import type { BudgetDataPayload } from '@/types';
import { isWebBudget } from '@/lib/budget/web';

export function useBudget(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.BUDGET(id),
    queryFn: () => BudgetService.get(id),
    enabled: !!id,
  });
}

export function useBudgetData(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.BUDGET_DATA(id),
    queryFn: () => BudgetService.getData(id),
    enabled: !!id,
  });
}

export function useUpdateBudgetData(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BudgetDataPayload) => BudgetService.updateData(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.BUDGET_DATA(id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.BUDGET(id) });
    },
  });
}

/** Budgets in the web model are read-only on mobile (see lib/budget/web.ts). */
export function useIsWebBudget(id: string): boolean {
  const { data } = useBudgetData(id);
  return isWebBudget(data?.data);
}
