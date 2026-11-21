import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { closeDialog, useDialog } from '../../lib/confirm';
import { colors, radius, shadow, space } from '../../theme';
import { Button } from './Button';
import { Text } from './Text';

export function DialogHost() {
  const d = useDialog((s) => s.current);
  if (!d) return null;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => closeDialog(false)}>
      <Pressable accessibilityLabel={d.cancel ?? d.ok} onPress={() => closeDialog(d.cancel ? false : true)}
        style={{ flex: 1, backgroundColor: '#000000A6', justifyContent: 'center', padding: space[6] }}>
        <Animated.View entering={ZoomIn.duration(160)} accessibilityViewIsModal
          style={[{ alignSelf: 'center', width: '100%', maxWidth: 380, gap: space[5], padding: space[5], borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, shadow.card]}>
          <Pressable>{/* Klicks im Dialog nicht nach außen durchreichen */}
            <Text variant="h3" accessibilityRole="alert">{d.message}</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: space[3] }}>
            {d.cancel ? <Button label={d.cancel} variant="secondary" size="m" onPress={() => closeDialog(false)} style={{ flex: 1 }} /> : null}
            <Button label={d.ok} variant={d.destructive ? 'danger' : 'primary'} size="m" onPress={() => closeDialog(true)} style={{ flex: 1 }} />
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
