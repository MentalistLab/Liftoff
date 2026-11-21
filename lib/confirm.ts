import { Alert, Platform } from 'react-native';

/** Ja/Nein-Dialog, der auch im Web funktioniert. */
export function confirm(message: string, ok: string, cancel: string, destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(message) ?? true);
  return new Promise((resolve) => Alert.alert(message, undefined, [
    { text: cancel, style: 'cancel', onPress: () => resolve(false) },
    { text: ok, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
  ]));
}
