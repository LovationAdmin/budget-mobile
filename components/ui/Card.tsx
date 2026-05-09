import React from 'react';
import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
};

export function Card({ children, padding = 'md', className, ...props }: CardProps) {
  return (
    <View
      className={`rounded-2xl bg-white shadow-sm ${paddingClasses[padding]} ${className ?? ''}`}
      style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
      {...props}
    >
      {children}
    </View>
  );
}
