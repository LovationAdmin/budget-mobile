// lib/budget/web.ts
// ============================================================================
// Budgets created or opened on the web app use the web data model (members
// with contributions, dated rules, closed months — schemaVersion 3). The
// files next to this one are copied verbatim from budget-ui/src/lib/budget so
// the mobile app shows exactly the web numbers. Keep them in sync with the
// web (copy, do not edit here).
//
// Until the mobile editors speak this model, such budgets are READ-ONLY on
// mobile: writing the mobile-only fields (income_sources, project.name…)
// would hide or corrupt data on the web.
// ============================================================================

import { decodeBudget } from './codec';
import { BudgetEngine, type ResolvedMonth } from './engine';
import { currentYM, formatMonthTitle } from './months';
import type { YM } from './types';
import { GENERAL_SAVINGS_ID } from './types';
import type { CalendarEntry, Charge as MobileCharge, Project as MobileProject } from '@/types';

export const READ_ONLY_WEB_BUDGET = 'READ_ONLY_WEB_BUDGET';

type Blob = Record<string, unknown> | null | undefined;

/** True when the blob follows the web model (always the case once opened on the web). */
export function isWebBudget(data: Blob): boolean {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.schemaVersion === 'number' && data.schemaVersion >= 3) return true;
  if (Array.isArray(data.people)) return true;
  const yd = data.yearlyData;
  return !!yd && typeof yd === 'object' && !Array.isArray(yd);
}

export interface WebCategorySlice {
  category: string;
  amount: number;
}

export interface WebMonthSummary {
  ym: YM;
  label: string;
  month: ResolvedMonth;
  /** Charges of the month grouped by category (biggest first). */
  byCategory: WebCategorySlice[];
}

/** The month as the web app shows it (frozen values for closed months). */
export function webMonthSummary(data: Blob, ym: YM = currentYM()): WebMonthSummary {
  const today = currentYM();
  const engine = new BudgetEngine(decodeBudget(data ?? {}, today), today);
  const month = engine.month(ym);
  const totals = new Map<string, number>();
  for (const c of month.charges) {
    if (!c.amount) continue;
    const k = c.category || 'other';
    totals.set(k, (totals.get(k) ?? 0) + c.amount);
  }
  const byCategory = Array.from(totals, ([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  return { ym, label: formatMonthTitle(ym), month, byCategory };
}

// ---------------------------------------------------------------------------
// Adapters to the mobile list shapes (read-only display)
// ---------------------------------------------------------------------------


const RECURRENCE = { monthly: 'monthly', custom: 'monthly', yearly: 'yearly', once: 'one-time' } as const;

/** Charges counted this month, as the web month screen lists them. */
export function webCharges(summary: WebMonthSummary): MobileCharge[] {
  return summary.month.charges
    .filter((c) => c.amount !== 0)
    .map((c) => ({ id: c.id, label: c.label, amount: c.amount, category: c.category || 'other', recurrence: RECURRENCE[c.frequency] }));
}

/** Savings pots with their balance at the end of the current month. */
export function webProjects(data: Blob): MobileProject[] {
  const today = currentYM();
  const model = decodeBudget(data ?? {}, today);
  const engine = new BudgetEngine(model, today);
  return model.projects
    .filter((p) => p.id !== GENERAL_SAVINGS_ID)
    .map((p) => ({ id: p.id, name: p.label, target_amount: Number(p.targetAmount) || 0, current_amount: engine.savingBalance(p.id, today) }));
}

/** The month as calendar lines: contributions and one-off income in, charges out. */
export function webMonthEntries(summary: WebMonthSummary): CalendarEntry[] {
  const date = `${summary.ym}-01`;
  const { month } = summary;
  return [
    ...month.people.filter((p) => p.contribution !== 0).map((p) => ({ id: `in-${p.id}`, label: p.name, amount: p.contribution, date, type: 'income' as const })),
    ...month.oneOffs.filter((o) => o.amount !== 0).map((o) => ({ id: `oo-${o.id}`, label: o.label, amount: o.amount, date, type: 'income' as const })),
    ...webCharges(summary).map((c) => ({ id: `ch-${c.id}`, label: c.label, amount: c.amount, date, type: 'expense' as const, category: c.category })),
  ];
}
