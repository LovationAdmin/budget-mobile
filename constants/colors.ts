export const COLORS = {
  primary:   '#6366f1',
  primary600: '#4f46e5',
  primary700: '#4338ca',
  success:   '#10b981',
  danger:    '#ef4444',
  warning:   '#f59e0b',
  muted:     '#64748b',
  border:    '#e2e8f0',
  bg:        '#f8fafc',
  surface:   '#ffffff',
  dark:      '#0f172a',
  text:      '#1e293b',
  textLight: '#94a3b8',
} as const;

export const CATEGORY_COLORS: Record<string, string> = {
  housing:   '#6366f1',
  transport: '#f59e0b',
  food:      '#10b981',
  health:    '#ef4444',
  education: '#3b82f6',
  leisure:   '#ec4899',
  savings:   '#14b8a6',
  other:     '#94a3b8',
};

export const CATEGORY_LABELS: Record<string, string> = {
  housing:   'Logement',
  transport: 'Transport',
  food:      'Alimentation',
  health:    'Santé',
  education: 'Éducation',
  leisure:   'Loisirs',
  savings:   'Épargne',
  other:     'Autre',
};
