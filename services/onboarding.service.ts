import * as SecureStore from 'expo-secure-store';

const ONBOARDED_KEY = 'bf_onboarding_done';

export const OnboardingService = {
  async isCompleted(): Promise<boolean> {
    const v = await SecureStore.getItemAsync(ONBOARDED_KEY);
    return v === 'true';
  },
  async markCompleted(): Promise<void> {
    await SecureStore.setItemAsync(ONBOARDED_KEY, 'true');
  },
  async reset(): Promise<void> {
    await SecureStore.deleteItemAsync(ONBOARDED_KEY);
  },
};
