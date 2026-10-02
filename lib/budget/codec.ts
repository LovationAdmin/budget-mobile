// src/lib/budget/codec.ts
// ============================================================================
// Stored JSON  <->  BudgetModel
// ============================================================================
// decodeBudget() accepts every format the app ever wrote:
//   - legacy single-year format (month-name keys at the top of yearlyData),
//   - year-based format (yearlyData["2026"].months[0..11] …),
//   - v3 additions (snapshots, one-off items, effective-dated rules).
// encodeBudget() always writes the year-based format with the legacy fields
// kept in sync, so the backend monthly recap and older cached clients keep
// working. Unknown keys are preserved in both directions.
// ============================================================================

import type {
  AmountStep,
  BudgetModel,
  Charge,
  ContributionStep,
  MonthRecord,
  MonthSnapshot,
  OneOffItem,
  Person,
  Project,
  YM,
} from './types';
import { GENERAL_SAVINGS_ID } from './types';
import {
  compareYM,
  isYM,
  makeYM,
  monthIndexFromName,
  MONTH_NAMES,
  yearOf,
  ymIndex,
} from './months';
import {
  BudgetEngine,
  buildSnapshot,
  chargeBaseAmount,
  emptyMonthRecord,
  isRecurringProject,
  personSalaryPlanned,
  projectPlanned,
  sortSteps,
  windowOf,
} from './engine';
import { roundCents } from './format';

export const SCHEMA_VERSION = 3;

const KNOWN_TOP_KEYS = new Set([
  'schemaVersion',
  'budgetTitle',
  'currentYear',
  'people',
  'charges',
  'personalCharges',
  'projects',
  'yearlyData',
  'yearlyExpenses',
  'oneTimeIncomes',
  'monthComments',
  'projectComments',
  'lockedMonths',
  'lastUpdated',
  'updatedBy',
  'version',
  'exportDate',
  'date',
  'chargeMappings',
]);

const KNOWN_YEAR_KEYS = new Set(['months', 'expenses', 'monthComments', 'expenseComments', 'lockedMonths', 'snapshots']);

type Dict = Record<string, unknown>;

const isObj = (v: unknown): v is Dict => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function numMap(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObj(v)) return out;
  for (const [k, val] of Object.entries(v)) {
    const n = typeof val === 'number' ? val : typeof val === 'string' ? Number(val) : NaN;
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

function strMap(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isObj(v)) return out;
  for (const [k, val] of Object.entries(v)) if (typeof val === 'string') out[k] = val;
  return out;
}

function ymMap(v: unknown): Record<YM, number> | undefined {
  if (!isObj(v)) return undefined;
  const out: Record<YM, number> = {};
  for (const [k, val] of Object.entries(v)) {
    if (!isYM(k)) continue;
    const n = typeof val === 'number' ? val : NaN;
    if (Number.isFinite(n)) out[k] = n;
  }
  return Object.keys(out).length ? out : undefined;
}

function amountSteps(v: unknown): AmountStep[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const steps = v
    .filter((s): s is Dict => isObj(s) && isYM(s.from) && Number.isFinite(Number(s.amount)))
    .map((s) => ({ from: s.from as YM, amount: Number(s.amount) }));
  return steps.length ? sortSteps(steps) : undefined;
}

function contributionSteps(v: unknown): ContributionStep[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const steps: ContributionStep[] = [];
  for (const s of v) {
    if (!isObj(s) || !isYM(s.from)) continue;
    const mode = s.mode === 'fixed' || s.mode === 'percent' || s.mode === 'all' ? s.mode : null;
    if (!mode) continue;
    const step: ContributionStep = { from: s.from as YM, mode };
    if (mode !== 'all') step.value = num(s.value);
    steps.push(step);
  }
  return steps.length ? sortSteps(steps) : undefined;
}

function setOrDelete<T extends object, K extends keyof T>(obj: T, key: K, value: T[K] | undefined) {
  if (value === undefined) delete obj[key];
  else obj[key] = value;
}

export function normalizePerson(raw: unknown, index: number): Person {
  const src = isObj(raw) ? raw : {};
  const p = { ...src } as unknown as Person;
  p.id = str(src.id) || `p-${index}-${Date.now()}`;
  p.name = str(src.name);
  p.salary = num(src.salary);
  setOrDelete(p, 'salaryHistory', amountSteps(src.salaryHistory));
  setOrDelete(p, 'salaryOverrides', ymMap(src.salaryOverrides));
  setOrDelete(p, 'contributions', contributionSteps(src.contributions));
  setOrDelete(p, 'contributionOverrides', ymMap(src.contributionOverrides));
  return p;
}

export function normalizeCharge(raw: unknown, index: number): Charge {
  const src = isObj(raw) ? raw : {};
  const c = { ...src } as unknown as Charge;
  c.id = str(src.id) || `c-${index}-${Date.now()}`;
  c.label = str(src.label);
  c.amount = num(src.amount);
  const freq = src.frequency;
  setOrDelete(c, 'frequency', freq === 'custom' || freq === 'yearly' || freq === 'once' || freq === 'monthly' ? freq : undefined);
  const months = Array.isArray(src.months)
    ? Array.from(new Set((src.months as unknown[]).map((m) => Math.trunc(num(m))).filter((m) => m >= 1 && m <= 12))).sort((a, b) => a - b)
    : undefined;
  setOrDelete(c, 'months', months && months.length ? months : undefined);
  if (c.frequency === 'custom' && !c.months) c.frequency = 'monthly';
  setOrDelete(c, 'smooth', src.smooth === true ? true : undefined);
  setOrDelete(c, 'amountHistory', amountSteps(src.amountHistory));
  setOrDelete(c, 'overrides', ymMap(src.overrides));
  setOrDelete(c, 'ownerId', typeof src.ownerId === 'string' && src.ownerId ? src.ownerId : undefined);
  setOrDelete(c, 'private', c.ownerId && src.private === true ? true : undefined);
  setOrDelete(c, 'createdBy', typeof src.createdBy === 'string' && src.createdBy ? src.createdBy : undefined);
  return c;
}

export function normalizeProject(raw: unknown, index: number): Project {
  const src = isObj(raw) ? raw : {};
  const p = { ...src } as unknown as Project;
  p.id = str(src.id) || `s-${index}-${Date.now()}`;
  p.label = str(src.label);
  if (src.monthlyAmount !== undefined && src.monthlyAmount !== null) {
    const n = Number(src.monthlyAmount);
    if (Number.isFinite(n)) p.monthlyAmount = n;
    else delete p.monthlyAmount;
  }
  setOrDelete(p, 'amountHistory', amountSteps(src.amountHistory));
  setOrDelete(p, 'overrides', ymMap(src.overrides));
  return p;
}

function decodeSnapshot(v: unknown): MonthSnapshot | undefined {
  if (!isObj(v) || v.v !== 1) return undefined;
  if (!Array.isArray(v.people) || !Array.isArray(v.charges) || !Array.isArray(v.projects)) return undefined;
  return {
    v: 1,
    closedAt: str(v.closedAt),
    people: (v.people as unknown[]).filter(isObj).map((p) => ({ id: str(p.id), name: str(p.name), salary: num(p.salary), contribution: num(p.contribution) })),
    charges: (v.charges as unknown[]).filter(isObj).map((c) => {
      const out: MonthSnapshot['charges'][number] = { id: str(c.id), label: str(c.label), amount: num(c.amount), planned: num(c.planned ?? c.amount) };
      if (typeof c.category === 'string') out.category = c.category;
      if (c.frequency === 'custom' || c.frequency === 'yearly' || c.frequency === 'once' || c.frequency === 'monthly') out.frequency = c.frequency;
      if (c.skipped === true) out.skipped = true;
      return out;
    }),
    projects: (v.projects as unknown[]).filter(isObj).map((p) => ({ id: str(p.id), label: str(p.label), allocation: num(p.allocation) })),
    oneOffs: Array.isArray(v.oneOffs) ? (v.oneOffs as unknown[]).filter(isObj).map((o, i) => ({ id: str(o.id) || `oo-${i}`, label: str(o.label), amount: num(o.amount) })) : [],
    ...(Array.isArray(v.personal)
      ? {
          personal: (v.personal as unknown[]).filter(isObj).filter((c) => typeof c.ownerId === 'string').map((c) => {
            const out: NonNullable<MonthSnapshot['personal']>[number] = { id: str(c.id), label: str(c.label), amount: num(c.amount), ownerId: str(c.ownerId) };
            if (typeof c.category === 'string') out.category = c.category;
            if (c.private === true) out.private = true;
            if (typeof c.createdBy === 'string') out.createdBy = c.createdBy;
            return out;
          }),
        }
      : {}),
  };
}

function decodeOneOffs(v: unknown, ym: YM): OneOffItem[] {
  if (typeof v === 'number') return v ? [{ id: `oo-${ym}-0`, label: 'Revenu ponctuel', amount: v }] : [];
  if (!isObj(v)) return [];
  const amount = num(v.amount);
  if (Array.isArray(v.items)) {
    const items = (v.items as unknown[])
      .filter(isObj)
      .map((it, i) => ({ id: str(it.id) || `oo-${ym}-${i}`, label: str(it.label) || 'Revenu ponctuel', amount: num(it.amount) }))
      .filter((it) => it.amount !== 0);
    const sum = roundCents(items.reduce((s, it) => s + it.amount, 0));
    if (items.length && Math.abs(sum - amount) < 0.01) return items;
  }
  if (!amount) return [];
  return [{ id: `oo-${ym}-0`, label: str(v.description).trim() || 'Revenu ponctuel', amount }];
}

function lockFrom(map: unknown, monthIdx: number): boolean | undefined {
  if (!isObj(map)) return undefined;
  for (const [k, v] of Object.entries(map)) {
    if (monthIndexFromName(k) === monthIdx && typeof v === 'boolean') return v;
  }
  return undefined;
}

/** Legacy global lock map, minus locks on future months (old contamination bug). */
function legacyLocksFor(map: unknown, year: number, today: YM): Dict {
  if (!isObj(map)) return {};
  const out: Dict = {};
  for (const [k, v] of Object.entries(map)) {
    const idx = monthIndexFromName(k);
    if (idx === undefined) continue;
    if (compareYM(makeYM(year, idx), today) > 0) continue;
    out[k] = v;
  }
  return out;
}

function isYearBased(yd: unknown): yd is Dict {
  return isObj(yd) && Object.entries(yd).some(([k, v]) => /^\d{4}$/.test(k) && isObj(v) && Array.isArray((v as Dict).months));
}

function isLegacyMonthNames(yd: unknown): yd is Dict {
  return isObj(yd) && Object.keys(yd).some((k) => monthIndexFromName(k) !== undefined);
}

export function decodeBudget(raw: unknown, today: YM): BudgetModel {
  const src: Dict = isObj(raw) ? raw : {};
  const model: BudgetModel = {
    budgetTitle: str(src.budgetTitle),
    people: Array.isArray(src.people) ? src.people.map(normalizePerson) : [],
    // Household charges, then members' personal charges (kept in one list in
    // memory, stored apart so the pot readers — recap, mobile — never count them).
    charges: [
      ...(Array.isArray(src.charges) ? src.charges.map(normalizeCharge) : []),
      // A personal charge always has its owner; without one it is a household charge.
      ...(Array.isArray(src.personalCharges) ? src.personalCharges.map((c, i) => normalizeCharge(c, 1000 + i)) : []),
    ],
    projects: Array.isArray(src.projects) ? src.projects.map(normalizeProject) : [],
    months: {},
    chargeMappings: Array.isArray(src.chargeMappings) ? src.chargeMappings : [],
    extras: {},
    yearExtras: {},
  };
  for (const [k, v] of Object.entries(src)) if (!KNOWN_TOP_KEYS.has(k)) model.extras[k] = v;

  const yd = src.yearlyData;
  const oneTime = isObj(src.oneTimeIncomes) ? src.oneTimeIncomes : {};

  if (isYearBased(yd)) {
    const legacyYear = Math.trunc(num(src.currentYear));
    for (const [yearKey, blockRaw] of Object.entries(yd)) {
      if (!/^\d{4}$/.test(yearKey) || !isObj(blockRaw)) continue;
      const year = Number(yearKey);
      const block = blockRaw as Dict;
      const months = Array.isArray(block.months) ? block.months : [];
      const expenses = Array.isArray(block.expenses) ? block.expenses : [];
      const monthComments = Array.isArray(block.monthComments) ? block.monthComments : [];
      const expenseComments = Array.isArray(block.expenseComments) ? block.expenseComments : [];
      const snapshots = Array.isArray(block.snapshots) ? block.snapshots : [];
      const locks = isObj(block.lockedMonths)
        ? block.lockedMonths
        : year === legacyYear
          ? legacyLocksFor(src.lockedMonths, year, today)
          : {};
      const yearOneTime = Array.isArray(oneTime[yearKey]) ? (oneTime[yearKey] as unknown[]) : [];
      for (let idx = 0; idx < 12; idx++) {
        const ym = makeYM(year, idx);
        const record: MonthRecord = {
          allocations: numMap(months[idx]),
          expenses: numMap(expenses[idx]),
          comment: str(monthComments[idx]),
          expenseComments: strMap(expenseComments[idx]),
          oneOffs: decodeOneOffs(yearOneTime[idx], ym),
        };
        const lock = lockFrom(locks, idx);
        if (lock !== undefined) record.lock = lock;
        const snap = decodeSnapshot(snapshots[idx]);
        if (snap && lock !== false) record.snapshot = snap;
        model.months[ym] = record;
      }
      const extra: Dict = {};
      for (const [k, v] of Object.entries(block)) if (!KNOWN_YEAR_KEYS.has(k)) extra[k] = v;
      if (Object.keys(extra).length) model.yearExtras[yearKey] = extra;
    }
  } else if (isLegacyMonthNames(yd)) {
    const year = Math.trunc(num(src.currentYear)) || yearOf(today);
    const yExp = isObj(src.yearlyExpenses) ? src.yearlyExpenses : {};
    const mComments = isObj(src.monthComments) ? src.monthComments : {};
    const pComments = isObj(src.projectComments) ? src.projectComments : {};
    const locks = legacyLocksFor(src.lockedMonths, year, today);
    const byIdx = <T,>(map: Dict, idx: number, pick: (v: unknown) => T): T | undefined => {
      for (const [k, v] of Object.entries(map)) if (monthIndexFromName(k) === idx) return pick(v);
      return undefined;
    };
    for (let idx = 0; idx < 12; idx++) {
      const ym = makeYM(year, idx);
      const record: MonthRecord = {
        allocations: byIdx(yd, idx, numMap) ?? {},
        expenses: byIdx(yExp, idx, numMap) ?? {},
        comment: byIdx(mComments, idx, str) ?? '',
        expenseComments: byIdx(pComments, idx, strMap) ?? {},
        oneOffs: byIdx(oneTime, idx, (v) => decodeOneOffs(v, ym)) ?? [],
      };
      const lock = lockFrom(locks, idx);
      if (lock !== undefined) record.lock = lock;
      model.months[ym] = record;
    }
  }
  return model;
}

/**
 * Past months close automatically (as the previous version auto-locked them),
 * and every closed month gets a frozen snapshot if it has none yet. Months a
 * user explicitly reopened (`lock === false`) stay open.
 */
export function autoCloseMonths(model: BudgetModel, today: YM, nowIso: string): { model: BudgetModel; changed: boolean } {
  const years = new Set<number>(Object.keys(model.months).map(yearOf));
  years.add(yearOf(today));
  let changed = false;
  const months = { ...model.months };
  const next: BudgetModel = { ...model, months };
  for (const year of Array.from(years).sort()) {
    for (let idx = 0; idx < 12; idx++) {
      const ym = makeYM(year, idx);
      const rec = months[ym];
      if (rec?.lock === false) continue;
      const isPast = compareYM(ym, today) < 0;
      const locked = rec?.lock === true || (rec?.lock === undefined && isPast);
      if (!locked) continue;
      if (rec?.lock === true && rec.snapshot) continue;
      const base = rec ?? emptyMonthRecord();
      months[ym] = { ...base, lock: true, snapshot: base.snapshot ?? buildSnapshot(next, ym, nowIso, true) };
      changed = true;
    }
  }
  return { model: changed ? next : model, changed };
}

/** Reference month used to keep the legacy single-amount fields meaningful. */
function referenceMonth(item: { startDate?: string; endDate?: string }, today: YM): YM {
  const w = windowOf(item);
  if (w.end && compareYM(w.end, today) < 0) return w.end;
  if (w.start && compareYM(w.start, today) > 0) return w.start;
  return today;
}

function syncPerson(p: Person, today: YM): Person {
  const out = { ...p };
  if (p.salaryHistory?.length) out.salary = personSalaryPlanned(p, referenceMonth(p, today));
  return out;
}

function syncCharge(c: Charge, today: YM): Charge {
  const out = { ...c };
  if (c.amountHistory?.length) out.amount = chargeBaseAmount(c, referenceMonth(c, today));
  return out;
}

function syncProject(p: Project, today: YM): Project {
  const out = { ...p };
  if (isRecurringProject(p) && p.amountHistory?.length) out.monthlyAmount = projectPlanned(p, referenceMonth(p, today));
  return out;
}

export function encodeBudget(model: BudgetModel, today: YM, nowIso: string): Dict {
  const engine = new BudgetEngine(model, today);
  const years = new Set<number>(Object.keys(model.months).map(yearOf));
  years.add(yearOf(today));
  const recurringIds = model.projects.filter((p) => p.id !== GENERAL_SAVINGS_ID && isRecurringProject(p)).map((p) => p.id);

  const yearlyData: Dict = {};
  const oneTimeIncomes: Dict = {};
  for (const year of Array.from(years).sort()) {
    const yearKey = String(year);
    const months: Array<Record<string, number>> = [];
    const expenses: Array<Record<string, number>> = [];
    const monthComments: string[] = [];
    const expenseComments: Array<Record<string, string>> = [];
    const snapshots: Array<MonthSnapshot | null> = [];
    const lockedMonths: Record<string, boolean> = {};
    const oneTime: Dict[] = [];
    for (let idx = 0; idx < 12; idx++) {
      const ym = makeYM(year, idx);
      const rec = model.months[ym] ?? emptyMonthRecord();
      const allocations: Record<string, number> = { ...rec.allocations };
      if (recurringIds.length) {
        // Recurring savings are derived from their rule; mirror the resolved
        // allocation (or the frozen one) so older readers see real numbers.
        const resolved = engine.month(ym);
        const byId = new Map(resolved.savings.map((s) => [s.id, s.allocation]));
        for (const id of recurringIds) allocations[id] = byId.get(id) ?? 0;
      }
      months.push(allocations);
      expenses.push({ ...rec.expenses });
      monthComments.push(rec.comment ?? '');
      expenseComments.push({ ...rec.expenseComments });
      const closed = engine.isClosed(ym);
      snapshots.push(closed && rec.snapshot ? rec.snapshot : null);
      if (rec.lock !== undefined) lockedMonths[MONTH_NAMES[idx]] = rec.lock;
      const items = rec.oneOffs ?? [];
      const amount = roundCents(items.reduce((s, it) => s + (Number(it.amount) || 0), 0));
      const entry: Dict = { amount, description: items.map((it) => it.label).join(', ').slice(0, 200) };
      if (items.length) entry.items = items.map((it) => ({ id: it.id, label: it.label, amount: roundCents(it.amount) }));
      oneTime.push(entry);
    }
    const extra = model.yearExtras[yearKey] ?? {};
    yearlyData[yearKey] = {
      deletedMonths: [],
      ...extra,
      months,
      expenses,
      monthComments,
      expenseComments,
      lockedMonths,
      snapshots,
    };
    oneTimeIncomes[yearKey] = oneTime;
  }

  const todayYearBlock = yearlyData[String(yearOf(today))] as Dict;
  return {
    ...model.extras,
    schemaVersion: SCHEMA_VERSION,
    budgetTitle: model.budgetTitle,
    currentYear: yearOf(today),
    people: model.people.map((p) => syncPerson(p, today)),
    charges: model.charges.filter((c) => !c.ownerId).map((c) => syncCharge(c, today)),
    personalCharges: model.charges.filter((c) => !!c.ownerId).map((c) => syncCharge(c, today)),
    projects: model.projects.map((p) => syncProject(p, today)),
    yearlyData,
    oneTimeIncomes,
    lockedMonths: { ...(todayYearBlock.lockedMonths as Dict) },
    date: nowIso,
    chargeMappings: model.chargeMappings,
  };
}

/** Months (sorted) the model stores, used for sanity checks and tests. */
export function storedMonths(model: BudgetModel): YM[] {
  return Object.keys(model.months).sort((a, b) => ymIndex(a) - ymIndex(b));
}
