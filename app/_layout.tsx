import '../lib/i18n';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CelebrationModal } from '../components/fx/CelebrationModal';
import { DialogHost } from '../components/ui/DialogHost';
import { runStartupChecks } from '../lib/startupChecks';
import { syncPending } from '../lib/sync';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync();
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } });

export default function RootLayout() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  useEffect(() => { syncPending().finally(runStartupChecks); }, []);
  // Zurück in der App (z. B. nach Training auf dem anderen Gerät) → neu abgleichen
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') syncPending().then(() => queryClient.invalidateQueries()).catch(() => undefined);
    });
    return () => sub.remove();
  }, []);
  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Screen name="workout/active" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
            <Stack.Screen name="workout/summary" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          </Stack>
          <CelebrationModal />
          <DialogHost />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
