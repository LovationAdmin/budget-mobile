import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, type TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  rightIcon?: React.ReactNode;
}

export function Input({ label, error, hint, rightIcon, secureTextEntry, ...props }: InputProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const isPassword = secureTextEntry !== undefined;

  return (
    <View className="mb-4">
      {label ? (
        <Text className="mb-1.5 text-sm font-medium text-foreground font-sans">{label}</Text>
      ) : null}
      <View
        className={`flex-row items-center rounded-xl border bg-card px-4 py-3 ${
          error ? 'border-danger' : 'border-border'
        }`}
      >
        <TextInput
          className="flex-1 text-base text-foreground font-sans"
          placeholderTextColor="#94a3b8"
          secureTextEntry={isPassword ? !visible : false}
          autoCapitalize="none"
          {...props}
        />
        {isPassword ? (
          <TouchableOpacity onPress={() => setVisible((v) => !v)} className="ml-2">
            <Text className="text-sm text-primary font-medium">
              {visible ? (t('common.no') /* fallback hide */, 'Masquer') : (t('common.yes') /* fallback show */, 'Voir')}
            </Text>
          </TouchableOpacity>
        ) : null}
        {rightIcon && !isPassword ? rightIcon : null}
      </View>
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
      {hint && !error ? <Text className="mt-1 text-xs text-muted-fg">{hint}</Text> : null}
    </View>
  );
}
