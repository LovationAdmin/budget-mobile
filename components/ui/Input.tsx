import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  rightIcon?: React.ReactNode;
}

export function Input({ label, error, hint, rightIcon, secureTextEntry, ...props }: InputProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = secureTextEntry !== undefined;

  return (
    <View className="mb-4">
      {label && (
        <Text className="mb-1.5 text-sm font-medium text-slate-700">{label}</Text>
      )}
      <View
        className={`flex-row items-center rounded-xl border bg-white px-4 py-3 ${
          error ? 'border-red-400' : 'border-slate-200'
        }`}
      >
        <TextInput
          className="flex-1 text-base text-slate-900 font-sans"
          placeholderTextColor="#94a3b8"
          secureTextEntry={isPassword ? !visible : false}
          autoCapitalize="none"
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setVisible((v) => !v)} className="ml-2">
            <Text className="text-sm text-primary-600">{visible ? 'Masquer' : 'Voir'}</Text>
          </TouchableOpacity>
        )}
        {rightIcon && !isPassword && rightIcon}
      </View>
      {error && <Text className="mt-1 text-xs text-red-500">{error}</Text>}
      {hint && !error && <Text className="mt-1 text-xs text-slate-400">{hint}</Text>}
    </View>
  );
}
