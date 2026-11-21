import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { colors, type as typo, type TypeVariant } from '../../theme';

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: string;
  tabular?: boolean;
}

export function Text({ variant = 'body', color = colors.text, tabular, style, ...rest }: AppTextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      style={[typo[variant], { color }, tabular && { fontVariant: ['tabular-nums'] }, style]}
      {...rest}
    />
  );
}
