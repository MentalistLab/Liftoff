import React from 'react';
import { View, type ViewProps } from 'react-native';
import { colors, radius, shadow, space } from '../../theme';

export function Card({ style, ...rest }: ViewProps) {
  return (
    <View
      style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space[4] }, shadow.card, style]}
      {...rest}
    />
  );
}
