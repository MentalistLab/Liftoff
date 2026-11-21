import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View, type TextInputProps } from 'react-native';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { useOnboarding } from '../../stores/onboarding';
import { useSettings } from '../../stores/settings';
import { colors, fonts, radius, space } from '../../theme';
import { Button, Text } from '../ui';

const USERNAME = /^[a-z0-9_.]{3,20}$/;

function Field(props: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: space[1] }}>
      <Text variant="caption" color={colors.textSecondary}>{props.label}</Text>
      <TextInput
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel={props.label}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        style={{ height: 52, paddingHorizontal: space[4], borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, fontFamily: fonts.regular, fontSize: 16 }}
      />
    </View>
  );
}

export function AccountStep({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const ob = useOnboarding();
  const language = useSettings((s) => s.language);
  const unitSystem = useSettings((s) => s.unitSystem);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const valid = USERNAME.test(username) && /.+@.+\..+/.test(email) && password.length >= 8;

  async function create() {
    setBusy(true); setMsg(null);
    try {
      const { data: free } = await supabase.rpc('username_available', { p_username: username });
      if (free === false) { setMsg(t('onboarding.account.taken')); return; }
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username, language } } });
      if (error) { setMsg(error.message); return; }
      if (!data.session) { setMsg(t('onboarding.account.check')); return; }
      await supabase.from('profiles').update({
        gender: ob.gender ?? 'none', birth_year: new Date().getFullYear() - ob.age, bodyweight_kg: ob.bodyweightKg,
        height_cm: ob.heightCm, experience: ob.experience, goal: ob.goal, location: ob.location,
        training_days: ob.trainingDays, language, unit_system: unitSystem,
      }).eq('id', data.session.user.id);
      onDone();
    } finally { setBusy(false); }
  }

  if (!supabaseConfigured) {
    return (
      <View style={{ gap: space[4] }}>
        <Text color={colors.warning}>{t('onboarding.account.offline')}</Text>
        <Button label={t('onboarding.account.later')} onPress={onDone} />
      </View>
    );
  }
  return (
    <View style={{ gap: space[3] }}>
      <Field label={t('onboarding.account.username')} value={username} onChangeText={(s) => setUsername(s.toLowerCase())} maxLength={20} />
      {username.length > 0 && !USERNAME.test(username) ? <Text variant="caption" color={colors.danger}>{t('onboarding.account.invalid')}</Text> : null}
      <Field label={t('onboarding.account.email')} value={email} onChangeText={setEmail} keyboardType="email-address" textContentType="emailAddress" />
      <Field label={t('onboarding.account.password')} value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" />
      {msg ? <Text variant="caption" color={colors.warning} accessibilityLiveRegion="polite">{msg}</Text> : null}
      <Button label={t('onboarding.account.create')} onPress={create} disabled={!valid} loading={busy} />
      <Button label={t('onboarding.account.later')} variant="ghost" onPress={onDone} />
    </View>
  );
}
