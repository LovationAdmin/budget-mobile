import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, type TouchableOpacityProps } from 'react-native';
import { palette } from '@/constants/colors';

type Variant = 'primary' | 'warm' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<Variant, { container: string; text: string; spinner: string }> = {
  primary: {
    container: 'bg-primary active:bg-primary-700',
    text:      'text-white font-semibold',
    spinner:   '#FFFFFF',
  },
  warm: {
    container: 'bg-warm-500 active:bg-warm-600',
    text:      'text-white font-semibold',
    spinner:   '#FFFFFF',
  },
  outline: {
    container: 'border border-primary bg-transparent active:bg-primary-50',
    text:      'text-primary font-semibold',
    spinner:   palette.primary,
  },
  ghost: {
    container: 'bg-transparent active:bg-muted',
    text:      'text-foreground font-medium',
    spinner:   palette.light.foreground,
  },
  danger: {
    container: 'bg-danger active:opacity-90',
    text:      'text-white font-semibold',
    spinner:   '#FFFFFF',
  },
};

const sizeClasses: Record<Size, { container: string; text: string }> = {
  sm: { container: 'px-3 py-2  rounded-lg', text: 'text-sm' },
  md: { container: 'px-5 py-3  rounded-xl', text: 'text-base' },
  lg: { container: 'px-6 py-4  rounded-2xl', text: 'text-lg' },
};

export function Button({
  variant = 'primary', size = 'md', loading = false,
  disabled, children, className, ...props
}: ButtonProps) {
  const v = variantClasses[variant];
  const s = sizeClasses[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      disabled={isDisabled}
      activeOpacity={0.8}
      className={`flex-row items-center justify-center ${v.container} ${s.container} ${isDisabled ? 'opacity-50' : ''} ${className ?? ''}`}
      {...props}
    >
      {loading && <ActivityIndicator size="small" color={v.spinner} style={{ marginRight: 8 }} />}
      <Text className={`${v.text} ${s.text}`}>{children}</Text>
    </TouchableOpacity>
  );
}
