// src/lib/budget/types.ts
// ============================================================================
// Budget data model — v3
// ============================================================================
// The budget is stored server-side as one opaque JSON blob. v3 is purely
// ADDITIVE on top of the historical format so that:
//   - the backend monthly recap and older (cached PWA) clients keep reading
//     the legacy fields (`salary`, `amount`, `monthlyAmount`, `startDate`,
//     `endDate`, `yearlyData`, `oneTimeIncomes`, `lockedMonths`);
//   - every legacy budget loads unchanged (no v3 field = legacy behaviour).
//
// What v3 adds:
//   - salary ≠ contribution: each member has a net salary AND a rule for what
//     they put in the household pot (all / fixed amount / % of salary);
//   - effective-dated amounts ("à partir de …") for salaries, contributions,
//     charges and savings, so an amount change never rewrites the past;
//   - month-only exceptions ("ce mois-ci seulement"), including skipping an
//     item for one month;
//   - charge frequencies (monthly, some months, yearly with optional
//     smoothing, one-off);
//   - closed months keep a frozen snapshot of their resolved values.
// ============================================================================

/** A calendar month, `YYYY-MM`. */
export type YM = string;

/** An effective-dated value: applies from `from` until the next step. */
export interface AmountStep {
  from: YM;
  amount: number;
}

export type ContributionMode = 'all' | 'fixed' | 'percent';

/** An effective-dated contribution rule. `value` is € (fixed) or % (percent). */
export interface ContributionStep {
  from: YM;
  mode: ContributionMode;
  value?: number;
}

export type Frequency = 'monthly' | 'custom' | 'yearly' | 'once';

export interface Person {
  id: string;
  name: string;
  /** Net monthly salary effective today (legacy readers use it everywhere). */
  salary: number;
  startDate?: string;
  endDate?: string;
  // ---- v3 ----
  salaryHistory?: AmountStep[];
  salaryOverrides?: Record<YM, number>;
  /** Contribution to the household pot. Absent = the whole salary (legacy). */
  contributions?: ContributionStep[];
  contributionOverrides?: Record<YM, number>;
}

export interface Charge {
  id: string;
  label: string;
  /** Amount effective today (legacy readers apply it to every month). */
  amount: number;
  startDate?: string;
  endDate?: string;
  category?: string;
  ignoreSuggestions?: boolean;
  description?: string;
  // ---- v3 ----
  /** Absent = monthly. */
  frequency?: Frequency;
  /** For `custom`: months of the year (1–12) the charge is due. */
  months?: number[];
  /** For `yearly`: set aside amount/12 every month instead of the full amount once. */
  smooth?: boolean;
  amountHistory?: AmountStep[];
  /** Month-only amounts. `0` = removed from that month. */
  overrides?: Record<YM, number>;
}

export interface Project {
  id: string;
  label: string;
  targetAmount?: number;
  /** Recurring saving ("épargne particulière") when set. */
  monthlyAmount?: number;
  startDate?: string;
  endDate?: string;
  // ---- v3 ----
  amountHistory?: AmountStep[];
  overrides?: Record<YM, number>;
}

export interface OneOffItem {
  id: string;
  label: string;
  amount: number;
}

export interface MonthSnapshot {
  v: 1;
  closedAt: string;
  people: Array<{ id: string; name: string; salary: number; contribution: number }>;
  charges: Array<{
    id: string;
    label: string;
    amount: number;
    planned: number;
    category?: string;
    frequency?: Frequency;
    skipped?: boolean;
  }>;
  projects: Array<{ id: string; label: string; allocation: number }>;
  oneOffs: OneOffItem[];
}

/** Everything the budget stores for one calendar month. */
export interface MonthRecord {
  /** Savings allocations by project id (manual projects; mirrors for recurring ones). */
  allocations: Record<string, number>;
  /** Money taken out of a pot by project id (`epargne` = general savings). */
  expenses: Record<string, number>;
  comment: string;
  expenseComments: Record<string, string>;
  oneOffs: OneOffItem[];
  /** Explicit lock state as stored. `undefined` = never set (past months auto-close). */
  lock?: boolean;
  snapshot?: MonthSnapshot;
}

/** The whole budget, normalised (all years at once). */
export interface BudgetModel {
  budgetTitle: string;
  people: Person[];
  charges: Charge[];
  projects: Project[];
  months: Record<YM, MonthRecord>;
  chargeMappings: unknown[];
  /** Unknown top-level keys, preserved verbatim on save. */
  extras: Record<string, unknown>;
  /** Unknown keys found inside each stored year block, preserved on save. */
  yearExtras: Record<string, Record<string, unknown>>;
}

export const GENERAL_SAVINGS_ID = 'epargne';
