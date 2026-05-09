import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen message="Chargement…" />;
  return <Redirect href={isAuthenticated ? '/(app)' : '/(auth)/login'} />;
}
