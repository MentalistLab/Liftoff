// Initialen-Avatar mit Rahmen in Rang-Farbe.
import React from 'react';
import { View } from 'react-native';
import { colors, radius } from '../../theme';
import { Text } from './Text';

export function Avatar({ name, tier, size = 40 }: { name: string; tier?: number | null; size?: number }) {
  const ring = tier ? colors.tiers[tier - 1] : colors.border;
  const initials = name.replace(/[^a-zA-Z0-9]/g, ' ').trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <View accessible={false} style={{ width: size, height: size, borderRadius: radius.full, borderWidth: 2, borderColor: ring, padding: 2 }}>
      <View style={{ flex: 1, borderRadius: radius.full, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant={size >= 48 ? 'h3' : 'caption'}>{initials}</Text>
      </View>
    </View>
  );
}
