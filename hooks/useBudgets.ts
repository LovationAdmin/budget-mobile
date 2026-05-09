import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BudgetService } from '@/services/budget.service';
import { QUERY_KEYS } from '@/constants/api';

export function useBudgets() {
  return useQuery({
    queryKey: QUERY_KEYS.BUDGETS,
    queryFn: BudgetService.list,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: BudgetService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.BUDGETS }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => BudgetService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.BUDGETS }),
  });
}
