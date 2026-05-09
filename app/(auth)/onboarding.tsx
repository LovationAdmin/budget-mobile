import React, { useRef, useState } from 'react';
import {
  View, Text, ScrollView, useWindowDimensions, TouchableOpacity, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  PiggyBank, Users, ShieldCheck, type LucideIcon,
} from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { palette } from '@/constants/colors';

interface Slide {
  Icon: LucideIcon;
  title: string;
  body: string;
  bg: string;
}

export default function Onboarding() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const slides: Slide[] = [
    {
      Icon: PiggyBank,
      title: t('app.name'),
      body: t('app.tagline'),
      bg: palette.warm,
    },
    {
      Icon: Users,
      title: t('budget.members.title'),
      body: t('budget.members.invite'),
      bg: palette.primary,
    },
    {
      Icon: ShieldCheck,
      title: t('profile.security'),
      body: t('biometric.subtitle'),
      bg: palette.secondary,
    },
  ];

  const next = () => {
    if (page < slides.length - 1) {
      scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
      setPage(page + 1);
    } else {
      router.replace('/(auth)/login');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false, listener: (e) => {
            const x = (e as unknown as { nativeEvent: { contentOffset: { x: number } } }).nativeEvent.contentOffset.x;
            setPage(Math.round(x / width));
          } },
        )}
        className="flex-1"
      >
        {slides.map((s, i) => (
          <View key={i} style={{ width }} className="flex-1 items-center justify-center px-8">
            <View
              className="mb-10 h-40 w-40 items-center justify-center rounded-full"
              style={{ backgroundColor: `${s.bg}20` }}
            >
              <s.Icon size={72} color={s.bg} />
            </View>
            <Text className="mb-3 text-center text-3xl text-foreground font-display-bold">
              {s.title}
            </Text>
            <Text className="text-center text-base text-muted-fg font-sans">
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <View className="my-6 flex-row items-center justify-center gap-2">
        {slides.map((_, i) => (
          <View
            key={i}
            className={`h-2 rounded-full ${i === page ? 'w-6 bg-warm-500' : 'w-2 bg-muted'}`}
          />
        ))}
      </View>

      <View className="flex-row items-center justify-between px-6 pb-6">
        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} className="py-3">
          <Text className="text-sm text-muted-fg font-sans">
            {page === slides.length - 1 ? '' : t('biometric.later')}
          </Text>
        </TouchableOpacity>
        <Button variant="warm" onPress={next} size="lg">
          {page === slides.length - 1 ? t('auth.signin') : t('common.next')}
        </Button>
      </View>
    </SafeAreaView>
  );
}
