import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BADGES, type BadgeDef } from '../../lib/badges';
import { useSettings } from '../../stores/settings';
import { colors, radius, space } from '../../theme';
import { Card, Text } from '../ui';

const CAT: Record<BadgeDef['category'], { emoji: string; color: string }> = {
  training: { emoji: '🏋️', color: colors.primary },
  streak: { emoji: '🔥', color: colors.warning },
  strength: { emoji: '💪', color: colors.danger },
  rank: { emoji: '💎', color: '#5AB8FF' },
  social: { emoji: '🤝', color: colors.accent },
  league: { emoji: '🏆', color: '#F5C451' },
};

function Emblem({ cat, earned, size = 52 }: { cat: BadgeDef['category']; earned: boolean; size?: number }) {
  const c = CAT[cat];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
        <Path d="M50 4 90 27 90 73 50 96 10 73 10 27Z" fill={earned ? c.color : colors.surface2} fillOpacity={earned ? 0.25 : 1} stroke={earned ? c.color : colors.border} strokeWidth={4} />
      </Svg>
      <Text variant="h3" style={{ opacity: earned ? 1 : 0.25 }}>{c.emoji}</Text>
    </View>
  );
}

export function BadgeWall({ earned }: { earned: Set<string> }) {
  const { t } = useTranslation();
  const lang = useSettings((s) => s.language);
  const [open, setOpen] = useState<string | null>(null);
  const sel = BADGES.find((b) => b.id === open);
  const sorted = [...BADGES].sort((a, b) => Number(earned.has(b.id)) - Number(earned.has(a.id)));
  return (
    <View style={{ gap: space[3] }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
        {sorted.map((b) => {
          const has = earned.has(b.id);
          const name = lang === 'de' ? b.nameDe : b.nameEn;
          return (
            <Pressable key={b.id} onPress={() => setOpen(open === b.id ? null : b.id)} accessibilityRole="button"
              accessibilityLabel={`${name}${has ? '' : ' (gesperrt)'}`}
              style={{ width: '23%', alignItems: 'center', gap: space[1], paddingVertical: space[2], borderRadius: radius.md, backgroundColor: open === b.id ? colors.surface2 : 'transparent' }}>
              <Emblem cat={b.category} earned={has} />
              <Text variant="caption" numberOfLines={1} color={has ? colors.text : colors.textTertiary} style={{ fontSize: 11 }}>{name}</Text>
            </Pressable>
          );
        })}
      </View>
      {sel ? (
        <Card style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
          <Emblem cat={sel.category} earned={earned.has(sel.id)} size={44} />
          <View style={{ flex: 1 }}>
            <Text variant="h3">{lang === 'de' ? sel.nameDe : sel.nameEn}</Text>
            <Text variant="caption" color={colors.textSecondary}>{lang === 'de' ? sel.descDe : sel.descEn}</Text>
            <Text variant="caption" color={CAT[sel.category].color}>{t(`profile.cat_${sel.category}`)}</Text>
          </View>
        </Card>
      ) : null}
    </View>
  );
}
