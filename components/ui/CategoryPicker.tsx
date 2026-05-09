import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CATEGORY_COLORS } from '@/constants/colors';
import type { ChargeCategory } from '@/types';

const CATEGORIES: ChargeCategory[] = [
  'housing', 'transport', 'food', 'health',
  'education', 'leisure', 'savings', 'other',
];

interface CategoryPickerProps {
  value?: string;
  onChange: (category: ChargeCategory) => void;
  label?: string;
}

export function CategoryPicker({ value, onChange, label }: CategoryPickerProps) {
  const { t } = useTranslation();
  return (
    <View className="mb-4">
      {label ? (
        <Text className="mb-2 text-sm text-foreground font-medium">{label}</Text>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
        <View className="flex-row gap-2 px-1">
          {CATEGORIES.map((cat) => {
            const active = value === cat;
            const color = CATEGORY_COLORS[cat];
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => onChange(cat)}
                className={`rounded-xl border px-3 py-2 ${
                  active ? 'border-transparent' : 'border-border bg-card'
                }`}
                style={active ? { backgroundColor: color } : undefined}
              >
                <Text
                  className={`text-xs font-display-semibold ${
                    active ? 'text-white' : 'text-foreground'
                  }`}
                >
                  {t(`categories.${cat}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
