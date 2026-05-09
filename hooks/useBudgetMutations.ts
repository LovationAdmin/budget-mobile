import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BudgetService } from '@/services/budget.service';
import { QUERY_KEYS } from '@/constants/api';
import type {
  BudgetDataEnvelope, BudgetDataPayload,
  Charge, Project, CalendarEntry, IncomeSource,
} from '@/types';

// ============================================================================
// Centralised CRUD over the versioned JSON blob (GET/PUT /budgets/:id/data).
// Strategy:
//   1. Read the current envelope from the React Query cache (synchronous).
//   2. Apply a pure transformer to envelope.data.
//   3. PUT the new payload, then invalidate.
//
// Optimistic cache update so the UI feels instant — server confirms / replaces.
// ============================================================================

const newId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function applyTotals(p: BudgetDataPayload): BudgetDataPayload {
  const charges = (p.charges ?? []) as Charge[];
  const incomes = (p.income_sources ?? []) as IncomeSource[];
  const total_expenses = charges.reduce((s, c) => s + (c.amount ?? 0), 0);
  const total_income   = incomes.reduce((s, i) => s + (i.amount ?? 0), 0);
  return { ...p, total_income, total_expenses, balance: total_income - total_expenses };
}

export function useBudgetMutations(budgetId: string) {
  const qc = useQueryClient();

  const mutate = useMutation({
    mutationFn: (payload: BudgetDataPayload) => BudgetService.updateData(budgetId, payload),
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.BUDGET_DATA(budgetId) });
      const prev = qc.getQueryData<BudgetDataEnvelope>(QUERY_KEYS.BUDGET_DATA(budgetId));
      if (prev) {
        qc.setQueryData<BudgetDataEnvelope>(QUERY_KEYS.BUDGET_DATA(budgetId), {
          ...prev,
          data: next,
          version: (prev.version ?? 0) + 1,
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(QUERY_KEYS.BUDGET_DATA(budgetId), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.BUDGET_DATA(budgetId) }),
  });

  function currentPayload(): BudgetDataPayload {
    const env = qc.getQueryData<BudgetDataEnvelope>(QUERY_KEYS.BUDGET_DATA(budgetId));
    return env?.data ?? {};
  }

  // ── Charges ──────────────────────────────────────────────────────────────
  const addCharge = (c: Omit<Charge, 'id'>) => {
    const data = currentPayload();
    const charges = [...((data.charges ?? []) as Charge[]), { ...c, id: newId() }];
    return mutate.mutateAsync(applyTotals({ ...data, charges }));
  };

  const updateCharge = (id: string, patch: Partial<Charge>) => {
    const data = currentPayload();
    const charges = ((data.charges ?? []) as Charge[]).map((c) =>
      c.id === id ? { ...c, ...patch } : c,
    );
    return mutate.mutateAsync(applyTotals({ ...data, charges }));
  };

  const removeCharge = (id: string) => {
    const data = currentPayload();
    const charges = ((data.charges ?? []) as Charge[]).filter((c) => c.id !== id);
    return mutate.mutateAsync(applyTotals({ ...data, charges }));
  };

  // ── Projects ─────────────────────────────────────────────────────────────
  const addProject = (p: Omit<Project, 'id'>) => {
    const data = currentPayload();
    const projects = [...((data.projects ?? []) as Project[]), { ...p, id: newId() }];
    return mutate.mutateAsync({ ...data, projects });
  };

  const updateProject = (id: string, patch: Partial<Project>) => {
    const data = currentPayload();
    const projects = ((data.projects ?? []) as Project[]).map((p) =>
      p.id === id ? { ...p, ...patch } : p,
    );
    return mutate.mutateAsync({ ...data, projects });
  };

  const removeProject = (id: string) => {
    const data = currentPayload();
    const projects = ((data.projects ?? []) as Project[]).filter((p) => p.id !== id);
    return mutate.mutateAsync({ ...data, projects });
  };

  // ── Calendar entries ─────────────────────────────────────────────────────
  const addCalendarEntry = (e: Omit<CalendarEntry, 'id'>) => {
    const data = currentPayload();
    const calendar_entries = [
      ...((data.calendar_entries ?? []) as CalendarEntry[]),
      { ...e, id: newId() },
    ];
    return mutate.mutateAsync({ ...data, calendar_entries });
  };

  const updateCalendarEntry = (id: string, patch: Partial<CalendarEntry>) => {
    const data = currentPayload();
    const calendar_entries = ((data.calendar_entries ?? []) as CalendarEntry[]).map((e) =>
      e.id === id ? { ...e, ...patch } : e,
    );
    return mutate.mutateAsync({ ...data, calendar_entries });
  };

  const removeCalendarEntry = (id: string) => {
    const data = currentPayload();
    const calendar_entries = ((data.calendar_entries ?? []) as CalendarEntry[]).filter(
      (e) => e.id !== id,
    );
    return mutate.mutateAsync({ ...data, calendar_entries });
  };

  // ── Income sources ───────────────────────────────────────────────────────
  const addIncome = (i: Omit<IncomeSource, 'id'>) => {
    const data = currentPayload();
    const income_sources = [
      ...((data.income_sources ?? []) as IncomeSource[]),
      { ...i, id: newId() },
    ];
    return mutate.mutateAsync(applyTotals({ ...data, income_sources }));
  };

  const updateIncome = (id: string, patch: Partial<IncomeSource>) => {
    const data = currentPayload();
    const income_sources = ((data.income_sources ?? []) as IncomeSource[]).map((i) =>
      i.id === id ? { ...i, ...patch } : i,
    );
    return mutate.mutateAsync(applyTotals({ ...data, income_sources }));
  };

  const removeIncome = (id: string) => {
    const data = currentPayload();
    const income_sources = ((data.income_sources ?? []) as IncomeSource[]).filter(
      (i) => i.id !== id,
    );
    return mutate.mutateAsync(applyTotals({ ...data, income_sources }));
  };

  return {
    isPending: mutate.isPending,
    addCharge,        updateCharge,        removeCharge,
    addProject,       updateProject,       removeProject,
    addCalendarEntry, updateCalendarEntry, removeCalendarEntry,
    addIncome,        updateIncome,        removeIncome,
  };
}
