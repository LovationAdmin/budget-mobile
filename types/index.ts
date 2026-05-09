// ============================================================================
// BudgetFamille Mobile — Shared types (mirrors budget-api models)
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  is_verified: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  /** refresh token is stored in HTTP-only cookie on web; on mobile we store it in SecureStore */
  refresh_token?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

// ── Budget ──────────────────────────────────────────────────────────────────

export type BudgetRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface BudgetMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: BudgetRole;
  monthly_contribution: number;
}

export interface Budget {
  id: string;
  name: string;
  description?: string;
  currency: string;
  created_at: string;
  updated_at: string;
  role: BudgetRole;
  members: BudgetMember[];
}

// ── Budget Data (full detail) ─────────────────────────────────────────────

export type ChargeCategory =
  | 'housing'
  | 'transport'
  | 'food'
  | 'health'
  | 'education'
  | 'leisure'
  | 'savings'
  | 'other';

export type RecurrenceType = 'monthly' | 'yearly' | 'one-time';

export interface Charge {
  id: string;
  label: string;
  amount: number;
  category: ChargeCategory;
  recurrence: RecurrenceType;
  assigned_to?: string; // member id
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
  date: string; // ISO date
  type: 'income' | 'expense';
  category?: ChargeCategory;
}

export interface IncomeSource {
  id: string;
  label: string;
  amount: number;
  member_id?: string;
}

export interface BudgetData {
  id: string;
  total_income: number;
  total_expenses: number;
  balance: number;
  income_sources: IncomeSource[];
  charges: Charge[];
  projects: Project[];
  calendar_entries: CalendarEntry[];
  members: BudgetMember[];
  reality?: RealityData;
}

export interface RealityData {
  planned_total: number;
  actual_total: number;
  by_category: Array<{
    category: ChargeCategory;
    planned: number;
    actual: number;
  }>;
  banking_connected: boolean;
}

// ── API Responses ────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}
