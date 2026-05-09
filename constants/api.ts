export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080') + '/api/v1';

export const ENDPOINTS = {
  // Auth
  LOGIN:           '/auth/login',
  SIGNUP:          '/auth/signup',
  LOGOUT:          '/auth/logout',
  LOGOUT_ALL:      '/auth/logout-all',
  REFRESH:         '/auth/refresh',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD:  '/auth/reset-password',
  VERIFY_EMAIL:    '/auth/verify-email',
  RESEND_VERIFY:   '/auth/verify/resend',

  // Budgets
  BUDGETS:         '/budgets',
  BUDGET:          (id: string) => `/budgets/${id}`,
  BUDGET_DATA:     (id: string) => `/budgets/${id}/data`,
  BUDGET_INVITE:   (id: string) => `/budgets/${id}/invite`,
  INVITATIONS:     (id: string) => `/budgets/${id}/invitations`,
  CANCEL_INVITATION: (budgetId: string, invId: string) =>
    `/budgets/${budgetId}/invitations/${invId}`,
  REMOVE_MEMBER:   (budgetId: string, memberId: string) =>
    `/budgets/${budgetId}/members/${memberId}`,

  // User
  PROFILE:         '/user/profile',
  CHANGE_PASSWORD: '/user/password',
  DELETE_ACCOUNT:  '/user/account',

  // Suggestions
  ANALYZE_CHARGE:  '/suggestions/analyze',
  BULK_ANALYZE:    (id: string) => `/budgets/${id}/suggestions/bulk-analyze`,

  // Banking
  BANKING_SYNC:    (id: string) => `/budgets/${id}/banking/enablebanking/sync`,
  REALITY_CHECK:   (id: string) => `/banking/budgets/${id}/reality-check`,
} as const;

export const QUERY_KEYS = {
  BUDGETS:     ['budgets'] as const,
  BUDGET:      (id: string) => ['budgets', id] as const,
  BUDGET_DATA: (id: string) => ['budgets', id, 'data'] as const,
  PROFILE:     ['profile'] as const,
};

export const SECURE_STORE_KEYS = {
  ACCESS_TOKEN:  'bf_access_token',
  REFRESH_TOKEN: 'bf_refresh_token',
  PUSH_TOKEN:    'bf_push_token',
};
