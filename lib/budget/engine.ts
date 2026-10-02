// src/lib/budget/engine.ts
// ============================================================================
// Budget engine — turns the rules (members, charges, savings) into the values
// of any given month. It is the ONLY place where month values are computed:
// every screen (month, year, savings, reality check…) reads from here.
//
// Precedence for a month:
//   1. closed month with a snapshot  → the frozen snapshot;
//   2. otherwise                     → the rules, where an effective-dated
//      step ("à partir de") beats the base amount and a month-only override
//      ("ce mois-ci seulement") beats both.
// ============================================================================

import type {
  BudgetModel,
  Charge,
  ContributionMode,
  ContributionStep,
  Frequency,
  MonthRecord,
  MonthSnapshot,
  OneOffItem,
  Person,
  Project,
  YM,
  AmountStep,
} from './types';
import { GENERAL_SAVINGS_ID } from './types';
import {
  addMonths,
  compareYM,
  currentYM,
  deMonth,
  formatMonthShort,
  joinFr,
  makeYM,
  monthIndex0,
  monthOf,
  MONTHS_LOWER,
  toYM,
  yearOf,
  ymFromIndex,
  ymIndex,
  formatMonthLong,
  monthsBetween,
} from './months';
import { roundCents } from './format';

// ---------------------------------------------------------------------------
// Resolved shapes
// ---------------------------------------------------------------------------

export interface ResolvedPerson {
  id: string;
  name: string;
  salary: number;
  contribution: number;
  keep: number;
  mode: ContributionMode;
  value?: number;
  salaryAdjusted: boolean;
  contributionAdjusted: boolean;
  deleted?: boolean;
  /** Personal charges this month (part of `keep`, not of the pot). */
  personalCharges: number;
  /** Pocket money left once personal charges are paid (`keep` − `personalCharges`). */
  available: number;
}

export interface ResolvedPersonalCharge {
  id: string;
  ownerId: string;
  label: string;
  category?: string;
  amount: number;
  private: boolean;
  createdBy?: string;
  frequency: Frequency;
}

export interface ResolvedCharge {
  id: string;
  label: string;
  category?: string;
  frequency: Frequency;
  smooth: boolean;
  /** Amount counted this month (0 when skipped). */
  amount: number;
  /** Amount the rules plan for this month (before a month-only override). */
  planned: number;
  /** Rule amount before smoothing (e.g. the yearly amount). */
  base: number;
  skipped: boolean;
  adjusted: boolean;
  /** Yearly charge: this is the month it is actually paid. */
  dueMonth: boolean;
  deleted?: boolean;
}

export interface ResolvedSaving {
  id: string;
  label: string;
  recurring: boolean;
  active: boolean;
  allocation: number;
  planned: number;
  skipped: boolean;
  adjusted: boolean;
  spent: number;
  spentComment: string;
  deleted?: boolean;
}

export interface MonthTotals {
  salaries: number;
  contributions: number;
  oneOff: number;
  entrees: number;
  charges: number;
  savings: number;
  reste: number;
  /** Members' personal charges this month (never part of `reste`). */
  personal: number;
}

export interface ResolvedMonth {
  ym: YM;
  closed: boolean;
  /** Values come from a frozen snapshot. */
  frozen: boolean;
  closedAt?: string;
  people: ResolvedPerson[];
  oneOffs: OneOffItem[];
  charges: ResolvedCharge[];
  savings: ResolvedSaving[];
  /** Members' personal charges (out of their pocket money). */
  personal: ResolvedPersonalCharge[];
  generalSpent: number;
  generalComment: string;
  comment: string;
  totals: MonthTotals;
}

export type ChangeKind = 'new' | 'resume' | 'up' | 'down' | 'end' | 'pause' | 'skip';

export interface MonthChange {
  kind: ChangeKind;
  scope: 'charge' | 'saving' | 'income';
  id: string;
  label: string;
  text: string;
  /** Effect on the month: + for more money out (charges/savings) or in (income). */
  delta: number;
  /** good = leaves more in the pot, bad = leaves less. */
  tone: 'good' | 'bad' | 'neutral';
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/** The step in force at `ym` (the first step when `ym` precedes them all). */
export function stepAt<T extends { from: YM }>(steps: T[] | undefined, ym: YM): T | undefined {
  if (!steps || steps.length === 0) return undefined;
  let current: T | undefined;
  for (const s of steps) {
    if (compareYM(s.from, ym) <= 0 && (!current || compareYM(s.from, current.from) >= 0)) current = s;
  }
  if (current) return current;
  return steps.reduce((a, b) => (compareYM(a.from, b.from) <= 0 ? a : b));
}

export function sortSteps<T extends { from: YM }>(steps: T[]): T[] {
  return steps.slice().sort((a, b) => compareYM(a.from, b.from));
}

const has = (o: Record<string, number> | undefined, k: string): boolean =>
  !!o && Object.prototype.hasOwnProperty.call(o, k) && typeof o[k] === 'number' && Number.isFinite(o[k]);

export interface Window {
  start?: YM;
  end?: YM;
}

export function windowOf(item: { startDate?: string; endDate?: string }): Window {
  return { start: toYM(item.startDate), end: toYM(item.endDate) };
}

export function inWindow(w: Window, ym: YM): boolean {
  if (w.start && compareYM(ym, w.start) < 0) return false;
  if (w.end && compareYM(ym, w.end) > 0) return false;
  return true;
}

export const chargeFrequency = (c: Charge): Frequency => c.frequency ?? 'monthly';

export function isRecurringProject(p: Project): boolean {
  return typeof p.monthlyAmount === 'number' && !Number.isNaN(p.monthlyAmount);
}

// ---------------------------------------------------------------------------
// Rules → values for one month
// ---------------------------------------------------------------------------

export function chargeOccurs(c: Charge, ym: YM): boolean {
  const w = windowOf(c);
  if (!inWindow(w, ym)) return false;
  const freq = chargeFrequency(c);
  if (freq === 'monthly') return true;
  if (freq === 'custom') return Array.isArray(c.months) && c.months.includes(monthOf(ym));
  if (freq === 'yearly') {
    if (c.smooth) return true;
    const anchor = w.start ?? stepAt(c.amountHistory, ym)?.from;
    return anchor ? monthOf(anchor) === monthOf(ym) : true;
  }
  if (freq === 'once') return w.start ? w.start === ym : false;
  return true;
}

export function chargeBaseAmount(c: Charge, ym: YM): number {
  const step = stepAt(c.amountHistory, ym);
  return roundCents(step ? step.amount : Number(c.amount) || 0);
}

export function resolveCharge(c: Charge, ym: YM): ResolvedCharge | null {
  if (!chargeOccurs(c, ym)) return null;
  const freq = chargeFrequency(c);
  const base = chargeBaseAmount(c, ym);
  const smooth = freq === 'yearly' && !!c.smooth;
  const planned = smooth ? roundCents(base / 12) : base;
  const overridden = has(c.overrides, ym);
  // A rule amount of 0 (e.g. the pause between a stop and a restart) means "not this month".
  if (planned === 0 && !overridden) return null;
  const amount = overridden ? roundCents(c.overrides![ym]) : planned;
  const w = windowOf(c);
  const anchor = w.start ?? stepAt(c.amountHistory, ym)?.from;
  return {
    id: c.id,
    label: c.label,
    category: c.category,
    frequency: freq,
    smooth,
    amount,
    planned,
    base,
    skipped: overridden && amount === 0,
    adjusted: overridden && amount !== 0 && amount !== planned,
    dueMonth: freq === 'yearly' && !!anchor && monthOf(anchor) === monthOf(ym),
  };
}

export function contributionFor(rule: ContributionStep | undefined, salary: number): number {
  if (!rule || rule.mode === 'all') return salary;
  if (rule.mode === 'fixed') return roundCents(Number(rule.value) || 0);
  return roundCents((salary * (Number(rule.value) || 0)) / 100);
}

export function personSalaryPlanned(p: Person, ym: YM): number {
  const step = stepAt(p.salaryHistory, ym);
  return roundCents(step ? step.amount : Number(p.salary) || 0);
}

export function resolvePerson(p: Person, ym: YM): ResolvedPerson | null {
  if (!inWindow(windowOf(p), ym)) return null;
  const salaryAdjusted = has(p.salaryOverrides, ym);
  const salary = salaryAdjusted ? roundCents(p.salaryOverrides![ym]) : personSalaryPlanned(p, ym);
  const rule = stepAt(p.contributions, ym);
  const planned = contributionFor(rule, salary);
  const contributionAdjusted = has(p.contributionOverrides, ym);
  const contribution = contributionAdjusted ? roundCents(p.contributionOverrides![ym]) : planned;
  return {
    id: p.id,
    name: p.name,
    salary,
    contribution,
    keep: roundCents(salary - contribution),
    mode: rule?.mode ?? 'all',
    value: rule?.value,
    salaryAdjusted,
    contributionAdjusted,
    personalCharges: 0,
    available: roundCents(salary - contribution),
  };
}

/** A member's personal charge (out of their pocket money, never in the pot). */
export const isPersonalCharge = (c: Charge): boolean => !!c.ownerId;

/** Charges paid by the household pot. */
export function householdCharges(model: BudgetModel): Charge[] {
  return model.charges.filter((c) => !c.ownerId);
}

/** Attaches personal charges to their owners (pocket money left = keep − personal). */
function withPersonal(people: ResolvedPerson[], personal: ResolvedPersonalCharge[]): ResolvedPerson[] {
  return people.map((p) => {
    const own = roundCents(personal.filter((c) => c.ownerId === p.id).reduce((a, c) => a + c.amount, 0));
    return { ...p, personalCharges: own, available: roundCents(p.keep - own) };
  });
}

export function projectPlanned(p: Project, ym: YM): number {
  const step = stepAt(p.amountHistory, ym);
  return roundCents(step ? step.amount : Number(p.monthlyAmount) || 0);
}

export function resolveSaving(
  p: Project,
  ym: YM,
  record: MonthRecord | undefined,
  storedRecurring = false,
): ResolvedSaving | null {
  const recurring = isRecurringProject(p);
  const spent = roundCents(record?.expenses?.[p.id] ?? 0);
  const spentComment = record?.expenseComments?.[p.id] ?? '';
  if (recurring) {
    const active = inWindow(windowOf(p), ym);
    // Migration of a month the previous version had already locked: its stored
    // allocation is what users saw, so it wins over the current rule.
    const stored = storedRecurring && record && has(record.allocations, p.id) ? roundCents(record.allocations[p.id]) : undefined;
    if (stored !== undefined) {
      if (stored === 0 && spent === 0 && !active) return null;
      return { id: p.id, label: p.label, recurring, active: active || stored !== 0, allocation: stored, planned: stored, skipped: false, adjusted: false, spent, spentComment };
    }
    const planned = active ? projectPlanned(p, ym) : 0;
    const overridden = active && has(p.overrides, ym);
    const allocation = overridden ? roundCents(p.overrides![ym]) : planned;
    if (!active && spent === 0) return null;
    // A rule amount of 0 (pause between a stop and a restart) means "not this month".
    if (active && planned === 0 && !overridden && spent === 0) return null;
    return {
      id: p.id,
      label: p.label,
      recurring,
      active,
      allocation,
      planned,
      skipped: overridden && allocation === 0,
      adjusted: overridden && allocation !== 0 && allocation !== planned,
      spent,
      spentComment,
    };
  }
  const allocation = roundCents(record?.allocations?.[p.id] ?? 0);
  return {
    id: p.id,
    label: p.label,
    recurring,
    active: true,
    allocation,
    planned: allocation,
    skipped: false,
    adjusted: false,
    spent,
    spentComment,
  };
}

function totalsOf(people: ResolvedPerson[], oneOffs: OneOffItem[], charges: ResolvedCharge[], savings: ResolvedSaving[], personal: ResolvedPersonalCharge[] = []): MonthTotals {
  const salaries = roundCents(people.reduce((s, p) => s + p.salary, 0));
  const contributions = roundCents(people.reduce((s, p) => s + p.contribution, 0));
  const oneOff = roundCents(oneOffs.reduce((s, o) => s + (Number(o.amount) || 0), 0));
  const chargesTotal = roundCents(charges.reduce((s, c) => s + c.amount, 0));
  const savingsTotal = roundCents(savings.reduce((s, x) => s + x.allocation, 0));
  const entrees = roundCents(contributions + oneOff);
  return {
    salaries,
    contributions,
    oneOff,
    entrees,
    charges: chargesTotal,
    savings: savingsTotal,
    reste: roundCents(entrees - chargesTotal - savingsTotal),
    personal: roundCents(personal.reduce((s, c) => s + c.amount, 0)),
  };
}

export function emptyMonthRecord(): MonthRecord {
  return { allocations: {}, expenses: {}, comment: '', expenseComments: {}, oneOffs: [] };
}

/** Values of a month computed from the rules (ignores any snapshot). */
export function resolveLiveMonth(model: BudgetModel, ym: YM, closed = false, storedRecurring = false): ResolvedMonth {
  const record = model.months[ym];
  const resolvedPeople: ResolvedPerson[] = [];
  for (const p of model.people) {
    const r = resolvePerson(p, ym);
    if (r) resolvedPeople.push(r);
  }
  const charges: ResolvedCharge[] = [];
  const personal: ResolvedPersonalCharge[] = [];
  for (const c of model.charges) {
    const r = resolveCharge(c, ym);
    if (!r) continue;
    if (c.ownerId) {
      if (r.amount !== 0) personal.push({ id: c.id, ownerId: c.ownerId, label: c.label, category: c.category, amount: r.amount, private: !!c.private, createdBy: c.createdBy, frequency: r.frequency });
    } else charges.push(r);
  }
  const people = withPersonal(resolvedPeople, personal);
  const savings: ResolvedSaving[] = [];
  for (const p of model.projects) {
    if (p.id === GENERAL_SAVINGS_ID) continue;
    const r = resolveSaving(p, ym, record, storedRecurring);
    if (r) savings.push(r);
  }
  const oneOffs = (record?.oneOffs ?? []).map((o) => ({ ...o }));
  return {
    ym,
    closed,
    frozen: false,
    people,
    oneOffs,
    charges,
    savings,
    personal,
    generalSpent: roundCents(record?.expenses?.[GENERAL_SAVINGS_ID] ?? 0),
    generalComment: record?.expenseComments?.[GENERAL_SAVINGS_ID] ?? '',
    comment: record?.comment ?? '',
    totals: totalsOf(people, oneOffs, charges, savings, personal),
  };
}

/**
 * Freezes the values of a month. `storedRecurring` is used when migrating a
 * month the previous version had locked (its stored allocations win).
 */
export function buildSnapshot(model: BudgetModel, ym: YM, closedAt: string, storedRecurring = false): MonthSnapshot {
  const live = resolveLiveMonth(model, ym, true, storedRecurring);
  return {
    v: 1,
    closedAt,
    people: live.people.map((p) => ({ id: p.id, name: p.name, salary: p.salary, contribution: p.contribution })),
    charges: live.charges.map((c) => ({
      id: c.id,
      label: c.label,
      amount: c.amount,
      planned: c.planned,
      ...(c.category ? { category: c.category } : {}),
      ...(c.frequency !== 'monthly' ? { frequency: c.frequency } : {}),
      ...(c.skipped ? { skipped: true } : {}),
    })),
    projects: live.savings.map((s) => ({ id: s.id, label: s.label, allocation: s.allocation })),
    oneOffs: live.oneOffs,
    ...(live.personal.length
      ? {
          personal: live.personal.map((c) => ({
            id: c.id,
            label: c.label,
            amount: c.amount,
            ownerId: c.ownerId,
            ...(c.category ? { category: c.category } : {}),
            ...(c.private ? { private: true } : {}),
            ...(c.createdBy ? { createdBy: c.createdBy } : {}),
          })),
        }
      : {}),
  };
}

function monthFromSnapshot(model: BudgetModel, ym: YM, snap: MonthSnapshot, record: MonthRecord | undefined): ResolvedMonth {
  const personIds = new Set(model.people.map((p) => p.id));
  const chargeById = new Map(model.charges.map((c) => [c.id, c]));
  const projectById = new Map(model.projects.map((p) => [p.id, p]));
  const people: ResolvedPerson[] = (snap.people ?? []).map((p) => {
    const salary = roundCents(p.salary);
    const contribution = roundCents(p.contribution);
    const mode: ContributionMode = contribution === salary ? 'all' : 'fixed';
    return {
      id: p.id,
      name: p.name,
      salary,
      contribution,
      keep: roundCents(salary - contribution),
      mode,
      value: mode === 'fixed' ? contribution : undefined,
      salaryAdjusted: false,
      contributionAdjusted: false,
      deleted: !personIds.has(p.id),
      personalCharges: 0,
      available: roundCents(salary - contribution),
    };
  });
  const charges: ResolvedCharge[] = (snap.charges ?? []).map((c) => {
    const def = chargeById.get(c.id);
    const freq: Frequency = c.frequency ?? 'monthly';
    return {
      id: c.id,
      label: def?.label ?? c.label,
      category: def?.category ?? c.category,
      frequency: freq,
      smooth: freq === 'yearly' && !!def?.smooth,
      amount: roundCents(c.amount),
      planned: roundCents(c.planned ?? c.amount),
      base: roundCents(c.planned ?? c.amount),
      skipped: !!c.skipped,
      adjusted: !c.skipped && roundCents(c.amount) !== roundCents(c.planned ?? c.amount),
      dueMonth: false,
      deleted: !def,
    };
  });
  const savingIds = new Set<string>();
  const savings: ResolvedSaving[] = (snap.projects ?? []).map((s) => {
    savingIds.add(s.id);
    const def = projectById.get(s.id);
    return {
      id: s.id,
      label: def?.label ?? s.label,
      recurring: def ? isRecurringProject(def) : false,
      active: true,
      allocation: roundCents(s.allocation),
      planned: roundCents(s.allocation),
      skipped: false,
      adjusted: false,
      spent: roundCents(record?.expenses?.[s.id] ?? 0),
      spentComment: record?.expenseComments?.[s.id] ?? '',
      deleted: !def,
    };
  });
  // Money taken out of a pot after closing (recorded expenses) still shows.
  for (const [pid, amount] of Object.entries(record?.expenses ?? {})) {
    if (pid === GENERAL_SAVINGS_ID || savingIds.has(pid) || !amount) continue;
    const def = projectById.get(pid);
    savings.push({
      id: pid,
      label: def?.label ?? 'Épargne supprimée',
      recurring: def ? isRecurringProject(def) : false,
      active: false,
      allocation: 0,
      planned: 0,
      skipped: false,
      adjusted: false,
      spent: roundCents(amount),
      spentComment: record?.expenseComments?.[pid] ?? '',
      deleted: !def,
    });
  }
  const oneOffs = (snap.oneOffs ?? []).map((o) => ({ ...o }));
  const personal: ResolvedPersonalCharge[] = (snap.personal ?? []).map((c) => {
    const def = chargeById.get(c.id);
    return {
      id: c.id,
      ownerId: c.ownerId,
      label: def?.label ?? c.label,
      category: def?.category ?? c.category,
      amount: roundCents(c.amount),
      private: def ? !!def.private : !!c.private,
      createdBy: def?.createdBy ?? c.createdBy,
      frequency: def?.frequency ?? 'monthly',
    };
  });
  const frozenPeople = withPersonal(people, personal);
  return {
    ym,
    closed: true,
    frozen: true,
    closedAt: snap.closedAt,
    people: frozenPeople,
    oneOffs,
    charges,
    savings,
    personal,
    generalSpent: roundCents(record?.expenses?.[GENERAL_SAVINGS_ID] ?? 0),
    generalComment: record?.expenseComments?.[GENERAL_SAVINGS_ID] ?? '',
    comment: record?.comment ?? '',
    totals: totalsOf(frozenPeople, oneOffs, charges, savings, personal),
  };
}

/**
 * Charges running at `from` whose last month falls before `to`: they weigh on
 * the first months only, which is why a 12-month average sits below the
 * current month. Sorted by last month.
 */
export function chargesEndingBetween(model: BudgetModel, from: YM, to: YM): Array<{ charge: Charge; last: YM }> {
  const out: Array<{ charge: Charge; last: YM }> = [];
  for (const c of householdCharges(model)) {
    const w = windowOf(c);
    if (!w.end || !inWindow(w, from) || compareYM(w.end, to) >= 0) continue;
    if (chargeFrequency(c) === 'once') continue;
    out.push({ charge: c, last: w.end });
  }
  return out.sort((a, b) => compareYM(a.last, b.last) || a.charge.label.localeCompare(b.charge.label, 'fr'));
}

export function isMonthClosed(model: BudgetModel, ym: YM, today: YM): boolean {
  const lock = model.months[ym]?.lock;
  if (lock === true) return true;
  if (lock === false) return false;
  return compareYM(ym, today) < 0;
}

// ---------------------------------------------------------------------------
// Statuses & texts
// ---------------------------------------------------------------------------

export type ItemStatus = 'active' | 'upcoming' | 'ended';

/** Status when the amount in force today is 0: paused until a later step, or over. */
function pausedStatus(steps: AmountStep[] | undefined, today: YM): ItemStatus | null {
  if (!steps || steps.length < 2) return null;
  const cur = stepAt(steps, today);
  if (!cur || roundCents(cur.amount) !== 0) return null;
  return steps.some((s) => compareYM(s.from, today) > 0 && roundCents(s.amount) !== 0) ? 'upcoming' : 'ended';
}

export function chargeStatus(c: Charge, today: YM): ItemStatus {
  const w = windowOf(c);
  if (chargeFrequency(c) === 'once') {
    if (!w.start) return 'active';
    const cmp = compareYM(w.start, today);
    return cmp === 0 ? 'active' : cmp < 0 ? 'ended' : 'upcoming';
  }
  if (w.end && compareYM(w.end, today) < 0) return 'ended';
  if (w.start && compareYM(w.start, today) > 0) return 'upcoming';
  return pausedStatus(c.amountHistory, today) ?? 'active';
}

export function projectStatus(p: Project, today: YM): ItemStatus {
  const w = windowOf(p);
  if (w.end && compareYM(w.end, today) < 0) return 'ended';
  if (w.start && compareYM(w.start, today) > 0) return 'upcoming';
  if (isRecurringProject(p)) return pausedStatus(p.amountHistory, today) ?? 'active';
  return 'active';
}

export function customMonthsText(months: number[] | undefined): string {
  const sorted = (months ?? []).slice().sort((a, b) => a - b);
  if (sorted.length === 0) return 'Aucun mois';
  if (sorted.length === 12) return 'Tous les mois';
  if (sorted.length >= 7) {
    const excluded: string[] = [];
    for (let m = 1; m <= 12; m++) if (!sorted.includes(m)) excluded.push(MONTHS_LOWER[m - 1]);
    return `Tous les mois sauf ${joinFr(excluded)}`;
  }
  return `En ${joinFr(sorted.map((m) => MONTHS_LOWER[m - 1]))}`;
}

/** Plain-language description of when a charge applies. */
export function describeChargeSchedule(c: Charge, today: YM): string {
  const w = windowOf(c);
  const freq = chargeFrequency(c);
  if (freq === 'once') return w.start ? `Une seule fois, en ${formatMonthLong(w.start)}` : 'Une seule fois';
  if (freq === 'yearly') {
    const anchor = w.start ?? stepAt(c.amountHistory, today)?.from;
    let t = anchor ? `Chaque année en ${MONTHS_LOWER[monthIndex0(anchor)]}` : 'Chaque année';
    if (c.smooth) t += ' · lissée sur 12 mois';
    if (w.end) t += ` · jusqu’en ${yearOf(w.end)}`;
    return t;
  }
  const base = freq === 'custom' ? customMonthsText(c.months) : 'Tous les mois';
  if (w.start && w.end) return `${base} · ${formatMonthShort(w.start)} → ${formatMonthShort(w.end)} (${monthsBetween(w.start, w.end)} mois)`;
  if (w.end) return `${base} · jusqu’à ${formatMonthShort(w.end)}`;
  if (w.start) return `${base} · ${compareYM(w.start, today) > 0 ? `à partir ${deMonth(formatMonthShort(w.start))}` : `depuis ${formatMonthShort(w.start)}`}`;
  return base;
}

/**
 * First month a saving is put aside monthly. A saving converted from a free
 * one starts with a 0 step (the months it was free): it starts at the first
 * non-zero step.
 */
function monthlyStart(p: Project): YM | undefined {
  const start = windowOf(p).start;
  const steps = p.amountHistory ? sortSteps(p.amountHistory) : [];
  if (steps.length > 1 && roundCents(steps[0].amount) === 0) return steps.find((s) => roundCents(s.amount) !== 0)?.from ?? start;
  return start;
}

/** Plain-language description of a recurring saving. */
export function describeProjectSchedule(p: Project, today: YM): string {
  const w = windowOf(p);
  if (!isRecurringProject(p)) return 'Montant libre, choisi mois par mois';
  const start = monthlyStart(p);
  if (start && w.end) return `${formatMonthShort(start)} → ${formatMonthShort(w.end)}`;
  if (w.end) return `Jusqu’à ${formatMonthShort(w.end)}`;
  if (start) return compareYM(start, today) > 0 ? `À partir ${deMonth(formatMonthShort(start))}` : `Depuis ${formatMonthShort(start)}`;
  return 'Chaque mois, sans échéance';
}

/** "1 250 € à partir d’oct. 2026" / "Depuis sept. 2026 · avant 1 150 €" */
export function amountHistoryHint(
  steps: AmountStep[] | undefined,
  ref: YM,
  fmt: (n: number) => string,
): string {
  if (!steps || steps.length < 2) return '';
  const sorted = sortSteps(steps);
  const cur = stepAt(sorted, ref)!;
  const i = sorted.indexOf(cur);
  const next = sorted[i + 1];
  // A leading 0 step is not a pause: it is the time before the amount existed
  // (e.g. a free saving turned into a monthly one).
  if (next) {
    if (roundCents(next.amount) === 0) return `En pause à partir ${deMonth(formatMonthShort(next.from))}`;
    if (roundCents(cur.amount) === 0 && i > 0) return `Reprend en ${formatMonthShort(next.from)} : ${fmt(next.amount)}`;
    return `${fmt(next.amount)} à partir ${deMonth(formatMonthShort(next.from))}`;
  }
  if (i > 0) {
    const before = sorted[i - 1];
    if (roundCents(before.amount) === 0) return i - 1 === 0 ? '' : `Reprise en ${formatMonthShort(cur.from)}`;
    return `Depuis ${formatMonthShort(cur.from)} · avant ${fmt(before.amount)}`;
  }
  return '';
}

export function contributionRuleText(mode: ContributionMode, value?: number): string {
  if (mode === 'all') return 'tout son salaire';
  if (mode === 'percent') return `${Math.round(Number(value) || 0)} % du salaire`;
  return 'montant fixe';
}

/** "tout le salaire" / "1 200 €" / "40 % du salaire" */
export function contributionStepText(step: ContributionStep, fmt: (n: number) => string): string {
  if (step.mode === 'all') return 'tout le salaire';
  if (step.mode === 'percent') return `${Math.round(Number(step.value) || 0)} % du salaire`;
  return fmt(Number(step.value) || 0);
}

/** "1 200 € à partir de janv. 2027" / "Depuis sept. 2026 · avant tout le salaire" */
export function contributionHistoryHint(p: Person, ref: YM, fmt: (n: number) => string): string {
  const steps = sortSteps(p.contributions ?? []);
  if (steps.length < 2) return '';
  const cur = stepAt(steps, ref)!;
  const i = steps.indexOf(cur);
  const next = steps[i + 1];
  if (next) return `${contributionStepText(next, fmt)} à partir ${deMonth(formatMonthShort(next.from))}`;
  if (i > 0) return `Depuis ${formatMonthShort(cur.from)} · avant ${contributionStepText(steps[i - 1], fmt)}`;
  return '';
}

export function personStatus(p: Person, today: YM): ItemStatus {
  const w = windowOf(p);
  if (w.end && compareYM(w.end, today) < 0) return 'ended';
  if (w.start && compareYM(w.start, today) > 0) return 'upcoming';
  return 'active';
}

// ---------------------------------------------------------------------------
// Engine (memoised view over one model)
// ---------------------------------------------------------------------------

export class BudgetEngine {
  readonly model: BudgetModel;
  readonly today: YM;
  /** First month of the running totals (January of the oldest stored year). */
  readonly firstMonth: YM;
  private cache = new Map<YM, ResolvedMonth>();
  private liveCache = new Map<YM, ResolvedMonth>();
  private generalCache = new Map<YM, number>();

  constructor(model: BudgetModel, today: YM = currentYM()) {
    this.model = model;
    this.today = today;
    let firstYear = yearOf(today);
    for (const ym of Object.keys(model.months)) firstYear = Math.min(firstYear, yearOf(ym));
    this.firstMonth = makeYM(firstYear, 0);
  }

  isClosed(ym: YM): boolean {
    return isMonthClosed(this.model, ym, this.today);
  }

  live(ym: YM): ResolvedMonth {
    let m = this.liveCache.get(ym);
    if (!m) {
      m = resolveLiveMonth(this.model, ym, this.isClosed(ym));
      this.liveCache.set(ym, m);
    }
    return m;
  }

  month(ym: YM): ResolvedMonth {
    let m = this.cache.get(ym);
    if (m) return m;
    const record = this.model.months[ym];
    const closed = this.isClosed(ym);
    if (closed && record?.snapshot) m = monthFromSnapshot(this.model, ym, record.snapshot, record);
    else m = { ...this.live(ym), closed };
    this.cache.set(ym, m);
    return m;
  }

  /** Balance of a savings pot at the END of `ym`. */
  savingBalance(projectId: string, ym: YM): number {
    const p = this.model.projects.find((x) => x.id === projectId);
    let start = this.firstMonth;
    if (p && isRecurringProject(p)) {
      const s = windowOf(p).start;
      if (s && compareYM(s, start) < 0) start = makeYM(yearOf(s), 0);
    }
    let total = 0;
    for (let i = ymIndex(start); i <= ymIndex(ym); i++) {
      const month = this.month(ymFromIndex(i));
      const s = month.savings.find((x) => x.id === projectId);
      if (s) total += s.allocation - s.spent;
    }
    return roundCents(total);
  }

  /** Balance of the general savings (what is left in the pot each month). */
  generalBalance(ym: YM): number {
    const cached = this.generalCache.get(ym);
    if (cached !== undefined) return cached;
    let total = 0;
    for (let i = ymIndex(this.firstMonth); i <= ymIndex(ym); i++) {
      const month = this.month(ymFromIndex(i));
      total += month.totals.reste - month.generalSpent;
    }
    const v = roundCents(total);
    this.generalCache.set(ym, v);
    return v;
  }

  /** Sum of the balances of every savings project (reality check). */
  projectsBalance(ym: YM): number {
    return roundCents(
      this.model.projects
        .filter((p) => p.id !== GENERAL_SAVINGS_ID)
        .reduce((s, p) => s + this.savingBalance(p.id, ym), 0),
    );
  }

  /** What changes in `ym` compared with the previous month. */
  changes(ym: YM): MonthChange[] {
    const cur = this.month(ym);
    const prev = this.month(addMonths(ym, -1));
    const out: MonthChange[] = [];
    const prevCharges = new Map(prev.charges.map((c) => [c.id, c]));
    const curCharges = new Map(cur.charges.map((c) => [c.id, c]));
    const defs = new Map(this.model.charges.map((c) => [c.id, c]));

    for (const c of cur.charges) {
      const p = prevCharges.get(c.id);
      if (c.skipped) {
        if (p && !p.skipped) out.push({ kind: 'skip', scope: 'charge', id: c.id, label: c.label, text: 'retirée ce mois-ci', delta: -p.amount, tone: 'good' });
        continue;
      }
      if (!p || p.skipped) {
        const def = defs.get(c.id);
        const start = def ? windowOf(def).start : undefined;
        const isNew = start === ym || (!start && !p && c.frequency !== 'custom' && c.frequency !== 'yearly');
        out.push({
          kind: isNew ? 'new' : 'resume',
          scope: 'charge',
          id: c.id,
          label: c.label,
          text: isNew ? (c.frequency === 'once' ? 'dépense ponctuelle' : 'nouvelle charge') : c.frequency === 'yearly' ? 'échéance annuelle' : 'reprend ce mois-ci',
          delta: c.amount,
          tone: 'bad',
        });
      } else if (Math.abs(p.amount - c.amount) >= 0.005) {
        out.push({
          kind: c.amount > p.amount ? 'up' : 'down',
          scope: 'charge',
          id: c.id,
          label: c.label,
          text: c.adjusted ? 'ajustée ce mois-ci' : c.amount > p.amount ? 'hausse' : 'baisse',
          delta: roundCents(c.amount - p.amount),
          tone: c.amount > p.amount ? 'bad' : 'good',
        });
      }
    }
    for (const p of prev.charges) {
      if (curCharges.has(p.id) || p.skipped) continue;
      const def = defs.get(p.id);
      let text = 'absente ce mois-ci';
      if (def) {
        const w = windowOf(def);
        const f = chargeFrequency(def);
        if (w.end === prev.ym) text = `terminée en ${MONTHS_LOWER[monthIndex0(prev.ym)]}`;
        else if (f === 'custom') text = 'en pause ce mois-ci';
        else if (f === 'once') text = 'ponctuelle, déjà passée';
        else if (f === 'yearly') text = 'échéance passée';
      }
      out.push({ kind: 'end', scope: 'charge', id: p.id, label: p.label, text, delta: -p.amount, tone: 'good' });
    }

    const prevSavings = new Map(prev.savings.map((s) => [s.id, s]));
    for (const s of cur.savings) {
      const p = prevSavings.get(s.id);
      if (s.allocation > 0 && (!p || p.allocation === 0)) {
        out.push({ kind: p ? 'resume' : 'new', scope: 'saving', id: s.id, label: s.label, text: p ? 'épargne reprise' : 'nouvelle épargne', delta: s.allocation, tone: 'neutral' });
      } else if (p && p.allocation > 0 && s.allocation === 0) {
        out.push({ kind: 'pause', scope: 'saving', id: s.id, label: s.label, text: 'rien mis de côté ce mois-ci', delta: -p.allocation, tone: 'neutral' });
      } else if (p && Math.abs(p.allocation - s.allocation) >= 0.005 && s.allocation > 0) {
        out.push({ kind: s.allocation > p.allocation ? 'up' : 'down', scope: 'saving', id: s.id, label: s.label, text: 'épargne modifiée', delta: roundCents(s.allocation - p.allocation), tone: 'neutral' });
      }
    }

    const prevPeople = new Map(prev.people.map((p) => [p.id, p]));
    for (const person of cur.people) {
      const p = prevPeople.get(person.id);
      if (!p) continue;
      if (Math.abs(p.contribution - person.contribution) >= 0.005) {
        out.push({
          kind: person.contribution > p.contribution ? 'up' : 'down',
          scope: 'income',
          id: person.id,
          label: person.name,
          text: 'contribution',
          delta: roundCents(person.contribution - p.contribution),
          tone: person.contribution > p.contribution ? 'good' : 'bad',
        });
      }
    }
    for (const o of cur.oneOffs) {
      out.push({ kind: 'new', scope: 'income', id: o.id, label: o.label, text: 'revenu ponctuel', delta: o.amount, tone: 'good' });
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// Contribution split assistant
// ---------------------------------------------------------------------------

export type SplitMethod = 'prorata' | 'equal' | 'reste' | 'all';

/**
 * Contributions that cover `need` for the given members.
 *  - prorata: each pays the same share of their salary;
 *  - equal:   each pays need / n;
 *  - reste:   each keeps the same amount for themselves (never below 0);
 *  - all:     each pays their whole salary.
 */
export function splitContributions(method: SplitMethod, salaries: number[], need: number): number[] {
  const n = salaries.length;
  if (n === 0) return [];
  if (method === 'all') return salaries.map((s) => roundCents(s));
  if (method === 'equal') return salaries.map(() => Math.round(need / n));
  const total = salaries.reduce((a, b) => a + b, 0);
  if (method === 'reste') {
    let active = salaries.map((_, i) => i);
    let result = salaries.map(() => 0);
    for (let guard = 0; guard < n + 1; guard++) {
      const sum = active.reduce((a, i) => a + salaries[i], 0);
      const keep = (sum - need) / Math.max(1, active.length);
      const negative = active.filter((i) => salaries[i] - keep < 0);
      result = salaries.map((s, i) => (active.includes(i) ? Math.round(s - keep) : 0));
      if (negative.length === 0) break;
      active = active.filter((i) => !negative.includes(i));
      if (active.length === 0) break;
    }
    return result;
  }
  return salaries.map((s) => (total > 0 ? Math.round((need * s) / total) : Math.round(need / n)));
}
