export const palette = {
  primary:   'hsl(200, 75%, 50%)',
  secondary: 'hsl(172, 50%, 50%)',
  warm:      '#F97316',
  success:   'hsl(152, 60%, 45%)',
  warning:   'hsl(38, 92%, 55%)',
  danger:    'hsl(0, 72%, 55%)',

  light: {
    background: '#FFFFFF',
    foreground: '#0F172A',
    card:       '#FFFFFF',
    muted:      '#F1F5F9',
    mutedFg:    '#64748B',
    border:     '#E2E8F0',
  },
  dark: {
    background: '#0F172A',
    foreground: '#F8FAFC',
    card:       '#1E293B',
    muted:      '#1E293B',
    mutedFg:    '#94A3B8',
    border:     '#334155',
  },
} as const;

// Backwards-compat alias used by older components in this repo.
export const COLORS = {
  primary:    palette.primary,
  primary600: '#1879B0',
  primary700: '#125B85',
  success:    palette.success,
  danger:     palette.danger,
  warning:    palette.warning,
  muted:      palette.light.mutedFg,
  border:     palette.light.border,
  bg:         palette.light.muted,
  surface:    palette.light.background,
  dark:       palette.dark.background,
  text:       palette.light.foreground,
  textLight:  '#94A3B8',
} as const;

export const gradients = {
  warm: ['#F97316', '#FB923C', '#FCD34D'],
  cool: ['hsl(172, 50%, 50%)', 'hsl(200, 75%, 50%)'],
} as const;

export const chartColors = [
  'hsl(200, 75%, 50%)',
  'hsl(172, 50%, 50%)',
  '#F97316',
  'hsl(260, 60%, 60%)',
  'hsl(38, 92%, 55%)',
  'hsl(152, 60%, 45%)',
  'hsl(330, 70%, 60%)',
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  housing:   'hsl(200, 75%, 50%)',
  transport: '#F97316',
  food:      'hsl(152, 60%, 45%)',
  health:    'hsl(0, 72%, 55%)',
  education: 'hsl(260, 60%, 60%)',
  leisure:   'hsl(330, 70%, 60%)',
  savings:   'hsl(172, 50%, 50%)',
  other:     '#94A3B8',
};

// Labels used as fallbacks before i18n hydrates.
export const CATEGORY_LABELS: Record<string, string> = {
  housing: 'Logement', transport: 'Transport', food: 'Alimentation',
  health: 'Sante', education: 'Education', leisure: 'Loisirs',
  savings: 'Epargne', other: 'Autre',
};
