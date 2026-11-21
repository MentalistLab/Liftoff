// Avatar mit Rahmen in Rang-Farbe: Profilbild, sonst Initialen.
import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { colors, radius } from '../../theme';
import { Text } from './Text';

export function Avatar({ name, tier, size = 40, uri }: { name: string; tier?: number | null; size?: number; uri?: string | null }) {
  const [failed, setFailed] = useState(false);
  const ring = tier ? colors.tiers[tier - 1] : colors.border;
  const initials = name.replace(/[^a-zA-Z0-9]/g, ' ').trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
  const inner = size - 8;
  return (
    <View accessible={false} style={{ width: size, height: size, borderRadius: radius.full, borderWidth: 2, borderColor: ring, padding: 2 }}>
      {uri && !failed ? (
        <Image source={{ uri }} onError={() => setFailed(true)} style={{ width: inner, height: inner, borderRadius: radius.full, backgroundColor: colors.surface2 }} />
      ) : (
        <View style={{ flex: 1, borderRadius: radius.full, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant={size >= 48 ? 'h3' : 'caption'}>{initials}</Text>
        </View>
      )}
    </View>
  );
}
