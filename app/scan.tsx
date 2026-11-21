// QR-Scanner (expo-camera, läuft in Expo Go).
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text } from '../components/ui';
import { usernameFromLink } from '../lib/invite';
import { colors, radius, space } from '../theme';

export default function Scan() {
  const { t } = useTranslation();
  const [perm, requestPerm] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  if (!perm) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (!perm.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: space[6], justifyContent: 'center', gap: space[4] }}>
        <Text variant="h2">{t('social.cameraNeeded')}</Text>
        <Button label={t('social.allowCamera')} onPress={requestPerm} />
        <Button label={t('social.close')} variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          if (handled.current) return;
          const name = usernameFromLink(data);
          if (!name) { setError(t('social.notAscend')); return; }
          handled.current = true;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace({ pathname: '/add/[username]', params: { username: name } });
        }} />
      <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', padding: space[5] }}>
        <Text variant="h3" style={{ textAlign: 'center', textShadowColor: '#000', textShadowRadius: 6 }}>{t('social.scanHint')}</Text>
        <View style={{ alignSelf: 'center', width: 240, height: 240, borderRadius: radius.xl, borderWidth: 3, borderColor: colors.accent }} />
        <View style={{ gap: space[2] }}>
          {error ? <Text color={colors.warning} style={{ textAlign: 'center' }}>{error}</Text> : null}
          <Button label={t('social.close')} variant="secondary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    </View>
  );
}
