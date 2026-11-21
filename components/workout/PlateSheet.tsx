import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PLATE_COLORS, platesFor } from '../../lib/plates';
import { colors, radius, space } from '../../theme';
import { Button, SegmentedControl, Stepper, Text } from '../ui';

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '')).replace('.', ',');

export function PlateSheet({ visible, initialKg, onClose }: { visible: boolean; initialKg: number; onClose: () => void }) {
  const { t: tr } = useTranslation();
  const t = tr as unknown as (k: string, o?: object) => string;
  const insets = useSafeAreaInsets();
  const [kg, setKg] = useState(initialKg || 60);
  const [bar, setBar] = useState<'20' | '15' | '10'>('20');
  useEffect(() => { if (visible) setKg(initialKg || 60); }, [visible, initialKg]);
  const r = platesFor(kg, Number(bar));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#00000099' }} onPress={onClose} accessibilityLabel={t('social.close')} />
      <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space[5], paddingBottom: insets.bottom + space[5], gap: space[4], borderWidth: 1, borderColor: colors.border }}>
        <Text variant="h2" accessibilityRole="header">{t('feat.plateTitle')}</Text>
        <Stepper big={false} label={t('feat.plateTitle')} value={kg} min={10} max={400} step={2.5} unit="kg" onChange={setKg} />
        <View style={{ gap: space[2] }}>
          <Text variant="caption" color={colors.textSecondary}>{t('feat.bar')}</Text>
          <SegmentedControl options={[{ value: '20', label: '20 kg' }, { value: '15', label: '15 kg' }, { value: '10', label: '10 kg' }]} value={bar} onChange={setBar} />
        </View>
        {/* Stange mit Scheiben (eine Seite gespiegelt) */}
        <View accessible accessibilityLabel={`${t('feat.perSide')}: ${r.perSide.map(fmt).join(', ') || t('feat.justBar')}`}
          style={{ height: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {[...r.perSide].reverse().map((p, i) => <PlateBlock key={`l${i}`} kg={p} />)}
          <View style={{ width: 90, height: 12, borderRadius: 3, backgroundColor: colors.textSecondary }} />
          {r.perSide.map((p, i) => <PlateBlock key={`r${i}`} kg={p} />)}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ gap: 2 }}>
            <Text variant="caption" color={colors.textSecondary}>{t('feat.perSide')}</Text>
            <Text variant="h2">{r.perSide.length ? r.perSide.map(fmt).join(' + ') : t('feat.justBar')}</Text>
          </View>
          <View style={{ gap: 2, alignItems: 'flex-end' }}>
            <Text variant="caption" color={colors.textSecondary}>{t('feat.total')}</Text>
            <Text variant="h2" tabular>{fmt(r.total)} kg</Text>
          </View>
        </View>
        {r.remainder > 0 ? <Text variant="caption" color={colors.warning}>{t('feat.rest', { kg: fmt(r.remainder) })}</Text> : null}
        <Button label={t('social.close')} variant="secondary" size="m" onPress={onClose} />
      </View>
    </Modal>
  );
}

function PlateBlock({ kg }: { kg: number }) {
  const h = 40 + Math.min(1, kg / 25) * 60;
  return (
    <View style={{ width: kg >= 10 ? 16 : 11, height: h, marginHorizontal: 1, borderRadius: 3, backgroundColor: PLATE_COLORS[String(kg)] ?? colors.textSecondary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 8, color: kg === 5 ? colors.onPrimary : '#FFFFFF' }}>{kg}</Text>
    </View>
  );
}
