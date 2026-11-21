import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CORE_EXERCISES, MUSCLES, type ExerciseDef, type Muscle } from '../../lib/standards';
import { useSettings } from '../../stores/settings';
import { colors, fonts, radius, space } from '../../theme';
import { Text } from '../ui';

export function useExerciseFilter() {
  const lang = useSettings((s) => s.language);
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CORE_EXERCISES.filter((e) =>
      (!muscle || e.primaryMuscle === muscle || e.secondaryMuscles.includes(muscle)) &&
      (!q || e.nameDe.toLowerCase().includes(q) || e.nameEn.toLowerCase().includes(q)));
  }, [query, muscle]);
  return { lang, query, setQuery, muscle, setMuscle, list };
}

export function exerciseName(e: ExerciseDef | undefined, lang: 'de' | 'en', fallback = '') {
  return e ? (lang === 'de' ? e.nameDe : e.nameEn) : fallback;
}

export function ExerciseFilterBar({ query, setQuery, muscle, setMuscle }: ReturnType<typeof useExerciseFilter>) {
  const { t } = useTranslation();
  const chip = (m: Muscle | null, label: string) => {
    const on = muscle === m;
    return (
      <Pressable key={label} onPress={() => setMuscle(m)} accessibilityRole="button" accessibilityState={{ selected: on }}
        style={{ paddingHorizontal: space[3], height: 32, justifyContent: 'center', borderRadius: radius.full, backgroundColor: on ? colors.primary : colors.surface2 }}>
        <Text variant="caption" color={on ? colors.text : colors.textSecondary}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View style={{ gap: space[3] }}>
      <TextInput value={query} onChangeText={setQuery} placeholder={t('train.search')} placeholderTextColor={colors.textTertiary} accessibilityLabel={t('train.search')}
        style={{ height: 44, paddingHorizontal: space[4], borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, color: colors.text, fontFamily: fonts.regular, fontSize: 16 }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}>
        {chip(null, t('train.all'))}
        {MUSCLES.map((m) => chip(m, t(`muscles.${m}`)))}
      </ScrollView>
    </View>
  );
}

export function ExerciseRow({ e, lang, onPress }: { e: ExerciseDef; lang: 'de' | 'en'; onPress?: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ padding: space[3], borderRadius: radius.md, backgroundColor: pressed ? colors.surface2 : colors.surface, borderWidth: 1, borderColor: colors.border })}>
      <Text variant="h3">{exerciseName(e, lang)}</Text>
      <Text variant="caption" color={colors.textSecondary}>{t(`muscles.${e.primaryMuscle}`)}{e.secondaryMuscles.length ? ' · ' + e.secondaryMuscles.map((m) => t(`muscles.${m}`)).join(', ') : ''}</Text>
    </Pressable>
  );
}

export function ExercisePicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (slug: string) => void }) {
  const { t } = useTranslation();
  const f = useExerciseFilter();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: space[4], gap: space[3] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="h2">{t('workout.pick')}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={12}><Text color={colors.primary}>{t('workout.cancel')}</Text></Pressable>
        </View>
        <ExerciseFilterBar {...f} />
        <FlatList data={f.list} keyExtractor={(e) => e.slug} contentContainerStyle={{ gap: space[2] }}
          renderItem={({ item }) => <ExerciseRow e={item} lang={f.lang} onPress={() => { onPick(item.slug); onClose(); }} />} />
      </SafeAreaView>
    </Modal>
  );
}
