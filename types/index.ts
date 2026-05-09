// ============================================================================
// BudgetFamille Mobile — Shared types
// Mirrors budget-api models (handlers/auth.go, models/*).
// Note: most "rich" budget detail (charges, projects, calendar, reality)
// lives inside a versioned JSON blob returned by GET /budgets/:id/data,
// not as separate REST resources.
// ============================================================================

// ── User & auth ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  totp_enabled: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number; // seconds
}

export interface LoginRequest {
  email: string;
  password: string;
  totp_code?: string;
}

export interface LoginResponse {
  token: string;
  refresh_token?: string; // mobile only
  expires_in: number;
  user: Pick<User, 'id' | 'email' | 'name' | 'avatar' | 'totp_enabled'>;
  requires_2fa?: boolean;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface MagicLinkRequest {
  email: string;
}

export interface MagicLinkVerifyRequest {
  token: string;
  device_id?: string;
}

// ── Devices (push notifications) ───────────────────────────────────────────

export interface UserDevice {
  id: string;
  expo_push_token: string;
  platform: 'ios' | 'android';
  app_version?: string;
  created_at: string;
  last_seen_at: string;
}

// ── Budget (REST) ──────────────────────────────────────────────────────────

export type BudgetRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface BudgetMember {
  id: string;
  budget_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: BudgetRole;
  permissions?: unknown;
  joined_at: string;
}

export interface Budget {
  id: string;
  name: string;
  owner_id: string;
  owner_name: string;
  is_owner: boolean;
  location: string;
  currency: string;
  created_at: string;
  updated_at: string;
  members: BudgetMember[];
}

export interface CreateBudgetRequest {
  name: string;
  location?: string;
  currency?: string;
}

export interface Invitation {
  id: string;
  budget_id: string;
  email: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
}

// ── Budget Data (JSON blob inside /budgets/:id/data) ───────────────────────
// Schema is versioned. We type the v2 layout pragmatically — unknown nested
// fields are passed through.

export type ChargeCategory =
  | 'housing' | 'transport' | 'food' | 'health'
  | 'education' | 'leisure' | 'savings' | 'other';

export type RecurrenceType = 'monthly' | 'yearly' | 'one-time';

export interface Charge {
  id: string;
  label: string;
  amount: number;
  category: ChargeCategory | string;
  recurrence?: RecurrenceType;
  assigned_to?: string;
  note?: string;
  market_suggestion?: MarketSuggestion;
}

export interface MarketSuggestion {
  suggested_price: number;
  savings_potential: number;
  provider?: string;
  confidence: number;
}

export interface Project {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  color?: string;
  icon?: string;
}

export interface CalendarEntry {
  id: string;
  label: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  category?: ChargeCategory | string;
}

export interface IncomeSource {
  id: string;
  label: string;
  amount: number;
  member_id?: string;
}

export interface BudgetDataPayload {
  version?: number;
  total_income?: number;
  total_expenses?: number;
  balance?: number;
  income_sources?: IncomeSource[];
  charges?: Charge[];
  projects?: Project[];
  calendar_entries?: CalendarEntry[];
  reality?: RealityData;
  // Pass-through for fields the mobile UI doesn't yet model.
  [k: string]: unknown;
}

export interface BudgetDataEnvelope {
  id: string;
  budget_id: string;
  data: BudgetDataPayload;
  version: number;
  updated_by: string;
  updated_at: string;
}

export interface RealityData {
  planned_total: number;
  actual_total: number;
  by_category: Array<{
    category: ChargeCategory | string;
    planned: number;
    actual: number;
  }>;
  banking_connected: boolean;
}

// ── Banking ────────────────────────────────────────────────────────────────

export interface BankAccount {
  id: string;
  connection_id: string;
  name: string;
  mask: string;
  currency: string;
  balance: number;
  is_savings_pool: boolean;
  last_synced_at: string;
}

export interface BankConnection {
  id: string;
  user_id: string;
  institution_id: string;
  institution_name: string;
  status: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  accounts?: BankAccount[];
}

// ── Errors ─────────────────────────────────────────────────────────────────

export interface ApiError {
  error?: string;
  message?: string;
  code?: string;
  email_not_verified?: boolean;
  requires_2fa?: boolean;
}
