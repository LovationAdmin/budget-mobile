import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function AuthLayout() {
  const { isAuthenticated, isLoading, isLocked } = useAuth();

  if (isLoading) return <LoadingScreen />;
  // Authenticated and unlocked → app. Authenticated but locked → biometric screen.
  if (isAuthenticated && !isLocked) return <Redirect href="/(app)" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="magic-link" />
      <Stack.Screen name="biometric-unlock" options={{ animation: 'fade' }} />
    </Stack>
  );
}
