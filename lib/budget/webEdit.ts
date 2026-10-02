// lib/budget/webEdit.ts
// ============================================================================
// Edits on web-model budgets, expressed with the web mutations (mutations.ts,
// copied from budget-ui) so a change made on mobile is stored exactly as the
// web would store it:
//   - rule changes (new charge, new amount, new saving) apply from the first
//     open month on — closed months keep their frozen snapshot;
//   - calendar lines are month-only: a one-off income, a one-off charge, or a
//     month-only amount / skip for a recurring charge;
//   - members and their contributions stay web-only (salary ≠ contribution
//     needs the web assistant).
// ============================================================================

import { autoCloseMonths, decodeBudget, encodeBudget } from './codec';
import { BudgetEngine, chargeFrequency } from './engine';
import { addMonths, currentYM, startDateOf } from './months';
import {
  addOneOff,
  deleteCharge,
  deleteProject,
  newId,
  removeOneOff,
  setChargeAmountFrom,
  setChargeMonthAmount,
  updateCharge,
  updateProject,
  upsertCharge,
  upsertProject,
} from './mutations';
import { roundCents } from './format';
import type { BudgetModel, Charge, Frequency, Project, YM } from './types';
import type {
  CalendarEntry,
  Charge as MobileCharge,
  Project as MobileProject,
  RecurrenceType,
} from '@/types';

export class WebEditError extends Error {
  constructor(public readonly code: 'closed_month' | 'not_found' | 'members_on_web') {
    super(code);
  }
}

export interface EditContext {
  today: YM;
  /** First month that is still open: rule changes start here. */
  firstOpen: YM;
  isClosed: (ym: YM) => boolean;
}

type Blob = Record<string, unknown>;
export type WebEdit = (model: BudgetModel, ctx: EditContext) => BudgetModel;

/** Decodes the stored blob, applies `edit` like the web does, and re-encodes it. */
export function editWebBudget(data: Blob, edit: WebEdit, now: Date = new Date()): Blob {
  const today = currentYM(now);
  const nowIso = now.toISOString();
  const model = autoCloseMonths(decodeBudget(data, today), today, nowIso).model;
  const engine = new BudgetEngine(model, today);
  let firstOpen = today;
  for (let i = 0; i < 36 && engine.isClosed(firstOpen); i++) firstOpen = addMonths(firstOpen, 1);
  const next = edit(model, { today, firstOpen, isClosed: (ym) => engine.isClosed(ym) });
  return encodeBudget(next, today, nowIso);
}

const FREQ: Record<RecurrenceType, Frequency | undefined> = { monthly: undefined, yearly: 'yearly', 'one-time': 'once' };
const toFrequency = (r?: RecurrenceType): Frequency | undefined => FREQ[r ?? 'monthly'];

function charge(model: BudgetModel, id: string): Charge {
  const c = model.charges.find((x) => x.id === id);
  if (!c) throw new WebEditError('not_found');
  return c;
}

function openMonth(ctx: EditContext, ym: YM): YM {
  if (ctx.isClosed(ym)) throw new WebEditError('closed_month');
  return ym;
}

// ---------------------------------------------------------------------------
// Charges tab (rules)
// ---------------------------------------------------------------------------

export const addChargeEdit = (c: Omit<MobileCharge, 'id'>): WebEdit => (model, ctx) => {
  const frequency = toFrequency(c.recurrence);
  const next: Charge = { id: newId('c'), label: c.label.trim(), amount: roundCents(c.amount), startDate: startDateOf(ctx.firstOpen) };
  if (c.category) next.category = String(c.category);
  if (frequency) next.frequency = frequency;
  return upsertCharge(model, next);
};

/** Label / category / frequency for the rule; a new amount applies from the first open month. */
export const updateChargeEdit = (id: string, patch: Partial<MobileCharge>, shownAmount: number): WebEdit => (model, ctx) => {
  const current = charge(model, id);
  const settings: Partial<Charge> = {};
  if (patch.label !== undefined) settings.label = patch.label.trim();
  if (patch.category !== undefined) settings.category = String(patch.category) || undefined;
  if (patch.recurrence !== undefined) {
    const frequency = toFrequency(patch.recurrence);
    if (frequency !== (chargeFrequency(current) === 'monthly' ? undefined : chargeFrequency(current))) {
      settings.frequency = frequency;
      if (frequency !== 'custom') settings.months = undefined;
      // A one-off / yearly charge is anchored on its start month.
      if (frequency === 'once' || frequency === 'yearly') settings.startDate = startDateOf(ctx.firstOpen);
    }
  }
  let next = updateCharge(model, id, settings);
  if (patch.amount !== undefined && roundCents(patch.amount) !== roundCents(shownAmount)) {
    next = setChargeAmountFrom(next, id, ctx.firstOpen, patch.amount, ctx.today);
  }
  return next;
};

/** Same as « Supprimer » on the web: the rule goes, closed months keep their snapshot. */
export const removeChargeEdit = (id: string): WebEdit => (model) => deleteCharge(model, charge(model, id).id);

// ---------------------------------------------------------------------------
// Savings (free pots: label + goal; amounts are set month by month on the web)
// ---------------------------------------------------------------------------

export const addProjectEdit = (p: Omit<MobileProject, 'id'>): WebEdit => (model) => {
  const next: Project = { id: newId('p'), label: p.name.trim() };
  if (p.target_amount > 0) next.targetAmount = roundCents(p.target_amount);
  return upsertProject(model, next);
};

export const updateProjectEdit = (id: string, patch: Partial<MobileProject>): WebEdit => (model) => {
  if (!model.projects.some((p) => p.id === id)) throw new WebEditError('not_found');
  const settings: Partial<Project> = {};
  if (patch.name !== undefined) settings.label = patch.name.trim();
  if (patch.target_amount !== undefined) settings.targetAmount = patch.target_amount > 0 ? roundCents(patch.target_amount) : undefined;
  return updateProject(model, id, settings);
};

export const removeProjectEdit = (id: string): WebEdit => (model) => deleteProject(model, id);

// ---------------------------------------------------------------------------
// Calendar lines (month-only). Ids come from webMonthEntries: `oo-…` one-off
// income, `ch-…` charge, `in-…` member contribution (web-only).
// ---------------------------------------------------------------------------

type Entry = Omit<CalendarEntry, 'id'>;
const ymOf = (date: string): YM => date.slice(0, 7);

function addLine(model: BudgetModel, ym: YM, e: Entry): BudgetModel {
  if (e.type === 'income') return addOneOff(model, ym, { label: e.label.trim(), amount: e.amount });
  const c: Charge = { id: newId('c'), label: e.label.trim(), amount: roundCents(e.amount), frequency: 'once', startDate: startDateOf(ym) };
  if (e.category) c.category = String(e.category);
  return upsertCharge(model, c);
}

function removeLine(model: BudgetModel, ym: YM, lineId: string): BudgetModel {
  if (lineId.startsWith('oo-')) return removeOneOff(model, ym, lineId.slice(3));
  if (lineId.startsWith('ch-')) {
    const c = charge(model, lineId.slice(3));
    // A one-off charge of this month goes away; a recurring one skips this month only.
    return chargeFrequency(c) === 'once' ? deleteCharge(model, c.id) : setChargeMonthAmount(model, c.id, ym, 0);
  }
  throw new WebEditError('members_on_web');
}

export const addEntryEdit = (e: Entry): WebEdit => (model, ctx) => addLine(model, openMonth(ctx, ymOf(e.date)), e);

export const updateEntryEdit = (lineId: string, ym: YM, e: Entry): WebEdit => (model, ctx) => {
  openMonth(ctx, ym);
  const target = openMonth(ctx, ymOf(e.date));
  // A recurring charge edited in place keeps its rule: month-only amount (and label/category for the rule).
  if (lineId.startsWith('ch-') && e.type === 'expense' && target === ym) {
    const c = charge(model, lineId.slice(3));
    if (chargeFrequency(c) !== 'once') {
      const next = updateCharge(model, c.id, { label: e.label.trim(), ...(e.category ? { category: String(e.category) } : {}) });
      return setChargeMonthAmount(next, c.id, ym, e.amount);
    }
  }
  return addLine(removeLine(model, ym, lineId), target, e);
};

export const removeEntryEdit = (lineId: string, ym: YM): WebEdit => (model, ctx) => removeLine(model, openMonth(ctx, ym), lineId);
