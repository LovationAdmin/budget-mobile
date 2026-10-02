// src/lib/budget/mutations.ts
// ============================================================================
// Pure, immutable edits of the BudgetModel. Every user action goes through one
// of these so the "ce mois-ci seulement / à partir de ce mois" semantics live
// in a single, tested place.
// ============================================================================

import type {
  AmountStep,
  BudgetModel,
  Charge,
  ContributionMode,
  ContributionStep,
  MonthRecord,
  OneOffItem,
  Person,
  Project,
  YM,
} from './types';
import {
  addMonths,
  compareYM,
  endDateOf,
  startDateOf,
} from './months';
import {
  buildSnapshot,
  chargeBaseAmount,
  emptyMonthRecord,
  personSalaryPlanned,
  contributionFor,
  projectPlanned,
  resolveCharge,
  resolvePerson,
  sortSteps,
  stepAt,
  windowOf,
  isRecurringProject,
} from './engine';
import { roundCents } from './format';

export type Scope = 'month' | 'forward' | 'all';

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

function mapById<T extends { id: string }>(list: T[], id: string, fn: (item: T) => T): T[] {
  return list.map((item) => (item.id === id ? fn(item) : item));
}

function withMap<T extends object, K extends keyof T>(obj: T, key: K, map: Record<string, number>): T {
  const out = { ...obj };
  if (Object.keys(map).length) (out as Record<string, unknown>)[key as string] = map;
  else delete out[key];
  return out;
}

/** Collapses consecutive steps with the same value. */
function collapse<T extends { from: YM }>(steps: T[], same: (a: T, b: T) => boolean): T[] {
  const sorted = sortSteps(steps);
  const out: T[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && same(last, s)) continue;
    out.push(s);
  }
  return out;
}

/** Effective-dated update: everything before `ym` is kept, `ym` onward takes `step`. */
function applyFrom<T extends { from: YM }>(steps: T[], ym: YM, step: T, same: (a: T, b: T) => boolean): T[] {
  const kept = sortSteps(steps).filter((s) => compareYM(s.from, ym) < 0);
  kept.push(step);
  return collapse(kept, same);
}

const sameAmount = (a: AmountStep, b: AmountStep) => roundCents(a.amount) === roundCents(b.amount);
const sameRule = (a: ContributionStep, b: ContributionStep) =>
  a.mode === b.mode && (a.mode === 'all' || roundCents(Number(a.value) || 0) === roundCents(Number(b.value) || 0));

/** First month a rule must cover when it gets its first history step. */
function seedMonth(item: { startDate?: string }, ym: YM): YM {
  const start = windowOf(item).start;
  if (start && compareYM(start, ym) < 0) return start;
  return addMonths(ym, -1);
}

function ensureMonth(model: BudgetModel, ym: YM): MonthRecord {
  return model.months[ym] ?? emptyMonthRecord();
}

function setMonth(model: BudgetModel, ym: YM, record: MonthRecord): BudgetModel {
  return { ...model, months: { ...model.months, [ym]: record } };
}

// ---------------------------------------------------------------------------
// Charges
// ---------------------------------------------------------------------------

export function upsertCharge(model: BudgetModel, charge: Charge): BudgetModel {
  const exists = model.charges.some((c) => c.id === charge.id);
  return { ...model, charges: exists ? mapById(model.charges, charge.id, () => charge) : [...model.charges, charge] };
}

export function updateCharge(model: BudgetModel, id: string, patch: Partial<Charge>): BudgetModel {
  return {
    ...model,
    charges: mapById(model.charges, id, (c) => {
      const next = { ...c, ...patch };
      for (const k of Object.keys(patch) as Array<keyof Charge>) if (patch[k] === undefined) delete next[k];
      return next;
    }),
  };
}

/** Month-only amount (`0` removes the charge from that month, `null` clears the exception). */
export function setChargeMonthAmount(model: BudgetModel, id: string, ym: YM, amount: number | null): BudgetModel {
  return {
    ...model,
    charges: mapById(model.charges, id, (c) => {
      const overrides = { ...(c.overrides ?? {}) };
      if (amount === null) delete overrides[ym];
      else {
        const planned = resolveCharge({ ...c, overrides: undefined }, ym)?.planned;
        const value = roundCents(amount);
        if (planned !== undefined && value === planned) delete overrides[ym];
        else overrides[ym] = value;
      }
      return withMap(c, 'overrides', overrides);
    }),
  };
}

/** New amount from `ym` onward; earlier months keep theirs. */
export function setChargeAmountFrom(model: BudgetModel, id: string, ym: YM, amount: number, today: YM): BudgetModel {
  return {
    ...model,
    charges: mapById(model.charges, id, (c) => {
      const history = c.amountHistory?.length ? c.amountHistory : [{ from: seedMonth(c, ym), amount: roundCents(c.amount) }];
      const amountHistory = applyFrom(history, ym, { from: ym, amount: roundCents(amount) }, sameAmount);
      const overrides = { ...(c.overrides ?? {}) };
      delete overrides[ym];
      let next: Charge = withMap({ ...c, amountHistory }, 'overrides', overrides);
      if (amountHistory.length === 1) {
        next = { ...next, amount: amountHistory[0].amount };
        delete next.amountHistory;
      } else {
        next.amount = chargeBaseAmount(next, clampToWindow(next, today));
      }
      return next;
    }),
  };
}

/** Corrects the amount everywhere (closed months keep their snapshot). */
export function setChargeAmountEverywhere(model: BudgetModel, id: string, amount: number): BudgetModel {
  return {
    ...model,
    charges: mapById(model.charges, id, (c) => {
      const next: Charge = { ...c, amount: roundCents(amount) };
      delete next.amountHistory;
      return next;
    }),
  };
}

/** Last month the charge counts. Returns `removed` when it would never have counted. */
export function stopCharge(model: BudgetModel, id: string, lastMonth: YM): { model: BudgetModel; removed: boolean } {
  const c = model.charges.find((x) => x.id === id);
  if (!c) return { model, removed: false };
  const start = windowOf(c).start;
  if (start && compareYM(lastMonth, start) < 0) {
    return { model: { ...model, charges: model.charges.filter((x) => x.id !== id) }, removed: true };
  }
  return { model: updateCharge(model, id, { endDate: endDateOf(lastMonth) }), removed: false };
}

/**
 * Amount steps for a restart: nothing between the stop and `fromMonth`, then
 * the last amount again. `null` when there is no gap to create.
 */
function restartSteps(steps: AmountStep[] | undefined, seed: AmountStep, end: YM, fromMonth: YM): AmountStep[] | null {
  const gapStart = addMonths(end, 1);
  if (compareYM(gapStart, fromMonth) >= 0) return null;
  const history = steps?.length ? steps : [seed];
  const resume = roundCents(stepAt(history, end)?.amount ?? seed.amount);
  let out = applyFrom(history, gapStart, { from: gapStart, amount: 0 }, sameAmount);
  out = applyFrom(out, fromMonth, { from: fromMonth, amount: resume }, sameAmount);
  return out;
}

/**
 * Restarts a stopped charge from `fromMonth`. Its history (and its anchor month
 * for yearly charges) is untouched; the months of the pause stay empty.
 */
export function restartCharge(model: BudgetModel, id: string, fromMonth: YM, today: YM): BudgetModel {
  const c = model.charges.find((x) => x.id === id);
  if (!c) return model;
  const { start, end } = windowOf(c);
  if (start && compareYM(start, fromMonth) >= 0) return updateCharge(model, id, { startDate: startDateOf(fromMonth), endDate: undefined });
  if (!end) return model;
  const steps = restartSteps(c.amountHistory, { from: seedMonth(c, addMonths(end, 1)), amount: roundCents(c.amount) }, end, fromMonth);
  if (!steps) return updateCharge(model, id, { endDate: undefined });
  const next: Charge = { ...c, amountHistory: steps };
  delete next.endDate;
  // Legacy readers use `amount` everywhere: the amount in force today, or at the restart if later.
  next.amount = chargeBaseAmount(next, compareYM(today, fromMonth) > 0 ? today : fromMonth);
  return upsertCharge(model, next);
}

export function deleteCharge(model: BudgetModel, id: string): BudgetModel {
  return { ...model, charges: model.charges.filter((c) => c.id !== id) };
}

function clampToWindow(item: { startDate?: string; endDate?: string }, ym: YM): YM {
  const w = windowOf(item);
  if (w.end && compareYM(ym, w.end) > 0) return w.end;
  if (w.start && compareYM(ym, w.start) < 0) return w.start;
  return ym;
}

// ---------------------------------------------------------------------------
// People (salary ≠ contribution)
// ---------------------------------------------------------------------------

export function upsertPerson(model: BudgetModel, person: Person): BudgetModel {
  const exists = model.people.some((p) => p.id === person.id);
  return { ...model, people: exists ? mapById(model.people, person.id, () => person) : [...model.people, person] };
}

export function updatePerson(model: BudgetModel, id: string, patch: Partial<Person>): BudgetModel {
  return {
    ...model,
    people: mapById(model.people, id, (p) => {
      const next = { ...p, ...patch };
      for (const k of Object.keys(patch) as Array<keyof Person>) if (patch[k] === undefined) delete next[k];
      return next;
    }),
  };
}

export function removePerson(model: BudgetModel, id: string): BudgetModel {
  return { ...model, people: model.people.filter((p) => p.id !== id) };
}

export interface ContributionRule {
  mode: ContributionMode;
  value?: number;
}

/**
 * Salary and contribution of a member, either for one month (exception) or
 * from `ym` onward (new rule, earlier months untouched).
 */
export function setPersonMoney(
  model: BudgetModel,
  id: string,
  ym: YM,
  salary: number,
  rule: ContributionRule,
  scope: 'month' | 'forward',
  today: YM,
): BudgetModel {
  return {
    ...model,
    people: mapById(model.people, id, (p) => {
      const salaryValue = roundCents(salary);
      const cleanRule: ContributionStep = rule.mode === 'all' ? { from: ym, mode: 'all' } : { from: ym, mode: rule.mode, value: roundCents(Number(rule.value) || 0) };
      if (scope === 'month') {
        const salaryOverrides = { ...(p.salaryOverrides ?? {}) };
        const plannedSalary = personSalaryPlanned(p, ym);
        if (salaryValue === plannedSalary) delete salaryOverrides[ym];
        else salaryOverrides[ym] = salaryValue;
        const contributionOverrides = { ...(p.contributionOverrides ?? {}) };
        const plannedRule = stepAt(p.contributions, ym);
        const plannedContribution = contributionFor(plannedRule, salaryValue);
        const wanted = contributionFor(cleanRule, salaryValue);
        if (wanted === plannedContribution) delete contributionOverrides[ym];
        else contributionOverrides[ym] = wanted;
        return withMap(withMap(p, 'salaryOverrides', salaryOverrides), 'contributionOverrides', contributionOverrides);
      }
      let next: Person = { ...p };
      if (salaryValue !== personSalaryPlanned(p, ym)) {
        const history = p.salaryHistory?.length ? p.salaryHistory : [{ from: seedMonth(p, ym), amount: roundCents(p.salary) }];
        const salaryHistory = applyFrom(history, ym, { from: ym, amount: salaryValue }, sameAmount);
        if (salaryHistory.length === 1) {
          next.salary = salaryHistory[0].amount;
          delete next.salaryHistory;
        } else {
          next.salaryHistory = salaryHistory;
          next.salary = personSalaryPlanned(next, clampToWindow(next, today));
        }
      }
      const currentRule = stepAt(p.contributions, ym) ?? { from: ym, mode: 'all' as const };
      if (!sameRule(currentRule, cleanRule)) {
        const history: ContributionStep[] = p.contributions?.length ? p.contributions : [{ from: seedMonth(p, ym), mode: 'all' }];
        next.contributions = applyFrom(history, ym, cleanRule, sameRule);
      }
      const salaryOverrides = { ...(next.salaryOverrides ?? {}) };
      delete salaryOverrides[ym];
      const contributionOverrides = { ...(next.contributionOverrides ?? {}) };
      delete contributionOverrides[ym];
      next = withMap(withMap(next, 'salaryOverrides', salaryOverrides), 'contributionOverrides', contributionOverrides);
      return next;
    }),
  };
}

/** Applies the same kind of rule to several members from `ym` onward. */
export function applyContributionRules(model: BudgetModel, ym: YM, rules: Record<string, ContributionRule>, today: YM): BudgetModel {
  let next = model;
  for (const person of model.people) {
    const rule = rules[person.id];
    if (!rule) continue;
    const r = resolvePerson(person, ym);
    const salary = r ? personSalaryPlanned(person, ym) : person.salary;
    next = setPersonMoney(next, person.id, ym, salary, rule, 'forward', today);
    // Month-only contribution exceptions after `ym` would silently beat the new rule.
    next = updatePerson(next, person.id, {
      contributionOverrides: filterFrom(next.people.find((p) => p.id === person.id)?.contributionOverrides, ym),
    });
  }
  return next;
}

function filterFrom(map: Record<YM, number> | undefined, ym: YM): Record<YM, number> | undefined {
  if (!map) return undefined;
  const out: Record<YM, number> = {};
  for (const [k, v] of Object.entries(map)) if (compareYM(k, ym) < 0) out[k] = v;
  return Object.keys(out).length ? out : undefined;
}

// ---------------------------------------------------------------------------
// Savings
// ---------------------------------------------------------------------------

export function upsertProject(model: BudgetModel, project: Project): BudgetModel {
  const exists = model.projects.some((p) => p.id === project.id);
  return { ...model, projects: exists ? mapById(model.projects, project.id, () => project) : [...model.projects, project] };
}

export function updateProject(model: BudgetModel, id: string, patch: Partial<Project>): BudgetModel {
  return {
    ...model,
    projects: mapById(model.projects, id, (p) => {
      const next = { ...p, ...patch };
      for (const k of Object.keys(patch) as Array<keyof Project>) if (patch[k] === undefined) delete next[k];
      return next;
    }),
  };
}

export function deleteProject(model: BudgetModel, id: string): BudgetModel {
  return { ...model, projects: model.projects.filter((p) => p.id !== id) };
}

/** Amount put aside in one month (recurring: exception; manual: the allocation itself). */
export function setSavingMonthAmount(model: BudgetModel, id: string, ym: YM, amount: number | null): BudgetModel {
  const p = model.projects.find((x) => x.id === id);
  if (!p) return model;
  if (!isRecurringProject(p)) {
    const rec = ensureMonth(model, ym);
    const allocations = { ...rec.allocations };
    if (amount === null || roundCents(amount) === 0) delete allocations[id];
    else allocations[id] = roundCents(amount);
    return setMonth(model, ym, { ...rec, allocations });
  }
  return {
    ...model,
    projects: mapById(model.projects, id, (proj) => {
      const overrides = { ...(proj.overrides ?? {}) };
      if (amount === null || roundCents(amount) === projectPlanned(proj, ym)) delete overrides[ym];
      else overrides[ym] = roundCents(amount);
      return withMap(proj, 'overrides', overrides);
    }),
  };
}

export function setSavingAmountFrom(model: BudgetModel, id: string, ym: YM, amount: number, today: YM): BudgetModel {
  return {
    ...model,
    projects: mapById(model.projects, id, (p) => {
      const base = Number(p.monthlyAmount) || 0;
      const history = p.amountHistory?.length ? p.amountHistory : [{ from: seedMonth(p, ym), amount: roundCents(base) }];
      const amountHistory = applyFrom(history, ym, { from: ym, amount: roundCents(amount) }, sameAmount);
      const overrides = { ...(p.overrides ?? {}) };
      delete overrides[ym];
      let next: Project = withMap({ ...p, amountHistory }, 'overrides', overrides);
      if (amountHistory.length === 1) {
        next = { ...next, monthlyAmount: amountHistory[0].amount };
        delete next.amountHistory;
      } else {
        next.monthlyAmount = projectPlanned(next, clampToWindow(next, today));
      }
      return next;
    }),
  };
}

export function setSavingAmountEverywhere(model: BudgetModel, id: string, amount: number): BudgetModel {
  return {
    ...model,
    projects: mapById(model.projects, id, (p) => {
      const next: Project = { ...p, monthlyAmount: roundCents(amount) };
      delete next.amountHistory;
      return next;
    }),
  };
}

export function stopProject(model: BudgetModel, id: string, lastMonth: YM): BudgetModel {
  return updateProject(model, id, { endDate: endDateOf(lastMonth) });
}

/** Restarts a stopped monthly saving from `fromMonth`; the pause stays empty. */
export function restartProject(model: BudgetModel, id: string, fromMonth: YM): BudgetModel {
  const p = model.projects.find((x) => x.id === id);
  if (!p) return model;
  const { start, end } = windowOf(p);
  if (start && compareYM(start, fromMonth) >= 0) return updateProject(model, id, { startDate: startDateOf(fromMonth), endDate: undefined });
  if (!end) return model;
  const steps = restartSteps(p.amountHistory, { from: seedMonth(p, addMonths(end, 1)), amount: roundCents(Number(p.monthlyAmount) || 0) }, end, fromMonth);
  if (!steps) return updateProject(model, id, { endDate: undefined });
  const next: Project = { ...p, amountHistory: steps };
  delete next.endDate;
  next.monthlyAmount = projectPlanned(next, fromMonth);
  return upsertProject(model, next);
}

/**
 * Turns a free saving (amount chosen month by month) into a monthly one from
 * `from`. Amounts put aside in earlier months are kept as month-only
 * exceptions, so nothing disappears: open months keep what was planned, and a
 * closed month (frozen by its snapshot) still finds its amount if reopened.
 */
export function convertSavingToMonthly(
  model: BudgetModel,
  id: string,
  from: YM,
  amount: number,
  today: YM,
  isClosed: (ym: YM) => boolean,
): BudgetModel {
  const p = model.projects.find((x) => x.id === id);
  if (!p || isRecurringProject(p)) return model;
  const value = roundCents(amount);
  const kept: Record<YM, number> = {};
  for (const [ym, rec] of Object.entries(model.months)) {
    const v = rec.allocations?.[id];
    if (compareYM(ym, from) < 0 && typeof v === 'number' && roundCents(v) !== 0) kept[ym] = roundCents(v);
  }
  const keptMonths = Object.keys(kept).sort(compareYM);
  let next: Project = { ...p, monthlyAmount: value, startDate: startDateOf(from) };
  delete next.amountHistory;
  delete next.overrides;
  delete next.endDate;
  if (keptMonths.length) {
    const first = keptMonths[0];
    next = {
      ...next,
      startDate: startDateOf(first),
      amountHistory: [
        { from: first, amount: 0 },
        { from, amount: value },
      ],
      overrides: kept,
    };
    next.monthlyAmount = projectPlanned(next, clampToWindow(next, today));
  }
  // The manual allocations of converted months are now carried by the rule.
  const months = { ...model.months };
  for (const [ym, rec] of Object.entries(model.months)) {
    if (isClosed(ym) || !rec.allocations || !(id in rec.allocations)) continue;
    const allocations = { ...rec.allocations };
    delete allocations[id];
    months[ym] = { ...rec, allocations };
  }
  return { ...model, months, projects: mapById(model.projects, id, () => next) };
}

/** Money taken out of a pot (`epargne` = general savings) in a month. */
export function setPotExpense(model: BudgetModel, potId: string, ym: YM, amount: number, comment: string): BudgetModel {
  const rec = ensureMonth(model, ym);
  const expenses = { ...rec.expenses };
  const expenseComments = { ...rec.expenseComments };
  if (roundCents(amount) === 0) {
    delete expenses[potId];
    delete expenseComments[potId];
  } else {
    expenses[potId] = roundCents(amount);
    if (comment.trim()) expenseComments[potId] = comment.trim();
    else delete expenseComments[potId];
  }
  return setMonth(model, ym, { ...rec, expenses, expenseComments });
}

// ---------------------------------------------------------------------------
// Months
// ---------------------------------------------------------------------------

export function addOneOff(model: BudgetModel, ym: YM, item: Omit<OneOffItem, 'id'>): BudgetModel {
  const rec = ensureMonth(model, ym);
  return setMonth(model, ym, { ...rec, oneOffs: [...rec.oneOffs, { id: newId('oo'), label: item.label, amount: roundCents(item.amount) }] });
}

export function removeOneOff(model: BudgetModel, ym: YM, id: string): BudgetModel {
  const rec = ensureMonth(model, ym);
  return setMonth(model, ym, { ...rec, oneOffs: rec.oneOffs.filter((o) => o.id !== id) });
}

export function setMonthComment(model: BudgetModel, ym: YM, comment: string): BudgetModel {
  const rec = ensureMonth(model, ym);
  return setMonth(model, ym, { ...rec, comment });
}

export function closeMonth(model: BudgetModel, ym: YM, nowIso: string): BudgetModel {
  const rec = ensureMonth(model, ym);
  return setMonth(model, ym, { ...rec, lock: true, snapshot: buildSnapshot(model, ym, nowIso) });
}

export function reopenMonth(model: BudgetModel, ym: YM): BudgetModel {
  const rec = ensureMonth(model, ym);
  const next: MonthRecord = { ...rec, lock: false };
  delete next.snapshot;
  return setMonth(model, ym, next);
}
