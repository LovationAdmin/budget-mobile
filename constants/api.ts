import Constants from 'expo-constants';

const RAW_BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'https://budget-api.onrender.com';

// Strip trailing slash and ensure /api/v1 suffix.
const ROOT = RAW_BASE.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
export const API_BASE_URL = `${ROOT}/api/v1`;
export const WS_BASE_URL  = `${ROOT.replace(/^http/, 'ws')}/api/v1`;

export const ENDPOINTS = {
  // Auth — mobile variants (refresh token returned in JSON, no cookie reliance)
  SIGNUP:           '/auth/signup',
  LOGIN:            '/auth/login',
  LOGIN_MOBILE:     '/auth/mobile/login',
  REFRESH:          '/auth/refresh',
  REFRESH_MOBILE:   '/auth/mobile/refresh',
  LOGOUT:           '/auth/logout',
  LOGOUT_MOBILE:    '/auth/mobile/logout',
  LOGOUT_ALL:       '/auth/logout-all',
  VERIFY_EMAIL:     '/auth/verify-email',
  RESEND_VERIFY:    '/auth/verify/resend',
  FORGOT_PASSWORD:  '/auth/forgot-password',
  RESET_PASSWORD:   '/auth/reset-password',
  MAGIC_REQUEST:    '/auth/magic-link/request',
  MAGIC_VERIFY:     '/auth/magic-link/verify',

  // User
  PROFILE:         '/user/profile',
  CHANGE_PASSWORD: '/user/password',
  TFA_SETUP:       '/user/2fa/setup',
  TFA_VERIFY:      '/user/2fa/verify',
  TFA_DISABLE:     '/user/2fa/disable',
  EXPORT_DATA:     '/user/export-data',
  DELETE_ACCOUNT:  '/user/account',
  DEVICES:         '/user/devices',

  // Budgets
  BUDGETS:        '/budgets',
  BUDGET:         (id: string) => `/budgets/${id}`,
  BUDGET_DATA:    (id: string) => `/budgets/${id}/data`,
  BUDGET_INVITE:  (id: string) => `/budgets/${id}/invite`,
  BUDGET_INVITES: (id: string) => `/budgets/${id}/invitations`,
  CANCEL_INVITE:  (b: string, i: string) => `/budgets/${b}/invitations/${i}`,
  REMOVE_MEMBER:  (b: string, m: string) => `/budgets/${b}/members/${m}`,
  ACCEPT_INVITE:  '/invitations/accept',

  // Suggestions / AI
  CATEGORIZE:      '/categorize',
  SUGGEST_ANALYZE: '/suggestions/analyze',
  BULK_ANALYZE:    (id: string) => `/budgets/${id}/suggestions/bulk-analyze`,

  // Banking (Enable Banking PSD2)
  BANKS:            '/banking/enablebanking/banks',
  BANK_CONNECT:     '/banking/enablebanking/connect',
  BANK_CONNECTIONS: (id: string) => `/budgets/${id}/banking/enablebanking/connections`,
  BANK_SYNC:        (id: string) => `/budgets/${id}/banking/enablebanking/sync`,
  BANK_REFRESH:     '/banking/enablebanking/refresh',
  BANK_TXNS:        '/banking/enablebanking/transactions',
  BANK_DELETE:      (id: string) => `/banking/enablebanking/connections/${id}`,
  REALITY_CHECK:    (id: string) => `/banking/budgets/${id}/reality-check`,
} as const;

export const QUERY_KEYS = {
  BUDGETS:      ['budgets'] as const,
  BUDGET:       (id: string) => ['budgets', id] as const,
  BUDGET_DATA:  (id: string) => ['budgets', id, 'data'] as const,
  PROFILE:      ['profile'] as const,
  REALITY:      (id: string) => ['budgets', id, 'reality'] as const,
};

export const SECURE_STORE_KEYS = {
  ACCESS_TOKEN:    'bf_access_token',
  REFRESH_TOKEN:   'bf_refresh_token',
  USER_PROFILE:    'bf_user_profile',
  PUSH_TOKEN:      'bf_push_token',
  BIOMETRIC_OPT:   'bf_biometric_enabled',
  LOCALE:          'bf_locale',
} as const;

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
