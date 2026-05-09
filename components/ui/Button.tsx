import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from 'react-native';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<Variant, { container: string; text: string }> = {
  primary: {
    container: 'bg-primary-600 active:bg-primary-700',
    text:      'text-white font-semibold',
  },
  outline: {
    container: 'border border-primary-600 bg-transparent active:bg-primary-50',
    text:      'text-primary-600 font-semibold',
  },
  ghost: {
    container: 'bg-transparent active:bg-slate-100',
    text:      'text-slate-700 font-medium',
  },
  danger: {
    container: 'bg-red-500 active:bg-red-600',
    text:      'text-white font-semibold',
  },
};

const sizeClasses: Record<Size, { container: string; text: string }> = {
  sm: { container: 'px-3 py-2 rounded-lg',    text: 'text-sm' },
  md: { container: 'px-5 py-3 rounded-xl',    text: 'text-base' },
  lg: { container: 'px-6 py-4 rounded-2xl',   text: 'text-lg' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  const v = variantClasses[variant];
  const s = sizeClasses[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      disabled={isDisabled}
      className={`flex-row items-center justify-center ${v.container} ${s.container} ${isDisabled ? 'opacity-50' : ''} ${className ?? ''}`}
      activeOpacity={0.75}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#ffffff' : '#6366f1'}
          className="mr-2"
        />
      )}
      <Text className={`${v.text} ${s.text}`}>{children}</Text>
    </TouchableOpacity>
  );
}
