import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, gradients, radius, space } from '../../theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const HEIGHT = { s: 36, m: 48, l: 56 } as const;

export function Button({ label, onPress, variant = 'primary', size = 'l', disabled, loading, style }: {
  label: string; onPress?: () => void; variant?: Variant; size?: keyof typeof HEIGHT;
  disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || loading;
  const content = loading
    ? <ActivityIndicator color={colors.text} />
    : <Text variant={size === 's' ? 'caption' : 'h3'} color={variant === 'ghost' ? colors.textSecondary : colors.text}>{label}</Text>;
  const box: ViewStyle = { height: HEIGHT[size], borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[5] };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }}
      style={({ pressed }) => [{ opacity: inactive ? 0.4 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={box}>{content}</LinearGradient>
      ) : (
        <View style={[box, variant === 'secondary' && { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border }, variant === 'danger' && { backgroundColor: colors.danger }]}>
          {content}
        </View>
      )}
    </Pressable>
  );
}
