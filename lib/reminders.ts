// Lokale Erinnerungen: an jedem geplanten Trainingstag um 17:30 und Sonntag 18:00 vor Liga-Ende.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const TEXT = {
  de: { train: ['Zeit fürs Training 💪', 'Heute steht dein Workout an – halte deinen Streak am Leben!'], league: ['Liga endet heute 🏆', 'Noch bis 23:59 Uhr XP sammeln und aufsteigen.'] },
  en: { train: ['Time to train 💪', 'Your workout is planned for today – keep your streak alive!'], league: ['League ends today 🏆', 'Earn XP until 23:59 to get promoted.'] },
};

/** ISO-Wochentag (1 = Mo … 7 = So) → Expo-Wochentag (1 = So … 7 = Sa). */
export const toExpoWeekday = (iso: number) => (iso % 7) + 1;

export async function scheduleReminders(days: number[], lang: 'de' | 'en'): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) {
    const req = await Notifications.requestPermissionsAsync();
    if (!req.granted) return false;
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
  const t = TEXT[lang];
  for (const d of days) {
    await Notifications.scheduleNotificationAsync({
      content: { title: t.train[0], body: t.train[1] },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: toExpoWeekday(d), hour: 17, minute: 30 },
    });
  }
  await Notifications.scheduleNotificationAsync({
    content: { title: t.league[0], body: t.league[1] },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 18, minute: 0 },
  });
  return true;
}

export async function cancelReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
