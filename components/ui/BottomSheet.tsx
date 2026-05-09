import React from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { palette } from '@/constants/colors';

// Lightweight bottom sheet — we deliberately avoid @gorhom/bottom-sheet to keep
// the dependency footprint small. Pure Modal + KeyboardAvoidingView covers the
// 99% case (forms with a few inputs).

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="rounded-t-3xl bg-card pb-10">
            <View className="flex-row items-center justify-between border-b border-border px-5 py-4">
              <Text className="text-xl text-foreground font-display-bold">{title}</Text>
              <TouchableOpacity onPress={onClose} className="p-1">
                <X size={22} color={palette.light.mutedFg} />
              </TouchableOpacity>
            </View>
            <ScrollView
              className="px-5 pt-4"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
