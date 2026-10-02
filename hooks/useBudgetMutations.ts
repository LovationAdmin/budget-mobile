import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BudgetService } from '@/services/budget.service';
import { QUERY_KEYS } from '@/constants/api';
import Toast from 'react-native-toast-message';
import i18n from '@/i18n';
import { isWebBudget, READ_ONLY_WEB_BUDGET } from '@/lib/budget/web';
import {
  addChargeEdit, addEntryEdit, addProjectEdit, editWebBudget,
  removeChargeEdit, removeEntryEdit, removeProjectEdit,
  updateChargeEdit, updateEntryEdit, updateProjectEdit,
  WebEditError, type WebEdit,
} from '@/lib/budget/webEdit';
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

  // Mobile-model payloads only: never write mobile fields into a web budget.
  function commit(payload: BudgetDataPayload) {
    if (isWebBudget(payload)) return Promise.reject(new Error(READ_ONLY_WEB_BUDGET));
    return mutate.mutateAsync(payload);
  }

  function currentPayload(): BudgetDataPayload {
    const env = qc.getQueryData<BudgetDataEnvelope>(QUERY_KEYS.BUDGET_DATA(budgetId));
    return env?.data ?? {};
  }

  // Web-model budgets: the edit is applied with the web mutations and the blob
  // re-encoded by the web codec (see lib/budget/webEdit.ts). Errors are shown
  // as a toast; the promise resolves so the form can close.
  async function commitWeb(edit: WebEdit): Promise<void> {
    try {
      const payload = editWebBudget(currentPayload(), edit) as BudgetDataPayload;
      await mutate.mutateAsync(payload);
    } catch (e) {
      const code = e instanceof WebEditError ? e.code : 'network';
      Toast.show({ type: 'error', text1: i18n.t(`budget.webEdit.${code}`, { defaultValue: i18n.t('errors.network') }) });
    }
  }

  const web = () => isWebBudget(currentPayload());

  // ── Charges ──────────────────────────────────────────────────────────────
  const addCharge = (c: Omit<Charge, 'id'>) => {
    if (web()) return commitWeb(addChargeEdit(c));
    const data = currentPayload();
    const charges = [...((data.charges ?? []) as Charge[]), { ...c, id: newId() }];
    return commit(applyTotals({ ...data, charges }));
  };

  /** `shownAmount`: the amount displayed for this month (web budgets only). */
  const updateCharge = (id: string, patch: Partial<Charge>, shownAmount?: number) => {
    if (web()) return commitWeb(updateChargeEdit(id, patch, shownAmount ?? Number.NaN));
    const data = currentPayload();
    const charges = ((data.charges ?? []) as Charge[]).map((c) =>
      c.id === id ? { ...c, ...patch } : c,
    );
    return commit(applyTotals({ ...data, charges }));
  };

  const removeCharge = (id: string) => {
    if (web()) return commitWeb(removeChargeEdit(id));
    const data = currentPayload();
    const charges = ((data.charges ?? []) as Charge[]).filter((c) => c.id !== id);
    return commit(applyTotals({ ...data, charges }));
  };

  // ── Projects ─────────────────────────────────────────────────────────────
  const addProject = (p: Omit<Project, 'id'>) => {
    if (web()) return commitWeb(addProjectEdit(p));
    const data = currentPayload();
    const projects = [...((data.projects ?? []) as Project[]), { ...p, id: newId() }];
    return commit({ ...data, projects });
  };

  const updateProject = (id: string, patch: Partial<Project>) => {
    if (web()) return commitWeb(updateProjectEdit(id, patch));
    const data = currentPayload();
    const projects = ((data.projects ?? []) as Project[]).map((p) =>
      p.id === id ? { ...p, ...patch } : p,
    );
    return commit({ ...data, projects });
  };

  const removeProject = (id: string) => {
    if (web()) return commitWeb(removeProjectEdit(id));
    const data = currentPayload();
    const projects = ((data.projects ?? []) as Project[]).filter((p) => p.id !== id);
    return commit({ ...data, projects });
  };

  // ── Calendar entries ─────────────────────────────────────────────────────
  // Web budgets: `month` is the YYYY-MM of the edited line (month-only edits).
  const addCalendarEntry = (e: Omit<CalendarEntry, 'id'>) => {
    if (web()) return commitWeb(addEntryEdit(e));
    const data = currentPayload();
    const calendar_entries = [
      ...((data.calendar_entries ?? []) as CalendarEntry[]),
      { ...e, id: newId() },
    ];
    return commit({ ...data, calendar_entries });
  };

  const updateCalendarEntry = (id: string, patch: Partial<CalendarEntry>, month?: string) => {
    if (web()) return commitWeb(updateEntryEdit(id, month ?? '', patch as Omit<CalendarEntry, 'id'>));
    const data = currentPayload();
    const calendar_entries = ((data.calendar_entries ?? []) as CalendarEntry[]).map((e) =>
      e.id === id ? { ...e, ...patch } : e,
    );
    return commit({ ...data, calendar_entries });
  };

  const removeCalendarEntry = (id: string, month?: string) => {
    if (web()) return commitWeb(removeEntryEdit(id, month ?? ''));
    const data = currentPayload();
    const calendar_entries = ((data.calendar_entries ?? []) as CalendarEntry[]).filter(
      (e) => e.id !== id,
    );
    return commit({ ...data, calendar_entries });
  };

  // ── Income sources (mobile model only: web members are edited on the web) ──
  const addIncome = (i: Omit<IncomeSource, 'id'>) => {
    const data = currentPayload();
    const income_sources = [
      ...((data.income_sources ?? []) as IncomeSource[]),
      { ...i, id: newId() },
    ];
    return commit(applyTotals({ ...data, income_sources }));
  };

  const updateIncome = (id: string, patch: Partial<IncomeSource>) => {
    const data = currentPayload();
    const income_sources = ((data.income_sources ?? []) as IncomeSource[]).map((i) =>
      i.id === id ? { ...i, ...patch } : i,
    );
    return commit(applyTotals({ ...data, income_sources }));
  };

  const removeIncome = (id: string) => {
    const data = currentPayload();
    const income_sources = ((data.income_sources ?? []) as IncomeSource[]).filter(
      (i) => i.id !== id,
    );
    return commit(applyTotals({ ...data, income_sources }));
  };

  return {
    isPending: mutate.isPending,
    addCharge,        updateCharge,        removeCharge,
    addProject,       updateProject,       removeProject,
    addCalendarEntry, updateCalendarEntry, removeCalendarEntry,
    addIncome,        updateIncome,        removeIncome,
  };
}
