import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View, type TextInputProps } from 'react-native';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { syncOnboarding } from '../../lib/sync';
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

export function AccountStep({ onDone, initialMode = 'signup' }: { onDone: () => void; initialMode?: 'signup' | 'signin' }) {
  const { t } = useTranslation();
  const language = useSettings((s) => s.language);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [mode, setMode] = useState(initialMode);

  const valid = (mode === 'signin' || USERNAME.test(username)) && /.+@.+\..+/.test(email) && password.length >= (mode === 'signin' ? 1 : 8);

  async function signIn() {
    setBusy(true); setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setMsg(t('onboarding.account.wrong')); return; }
      await syncOnboarding();
      onDone();
    } finally { setBusy(false); }
  }

  async function create() {
    setBusy(true); setMsg(null);
    try {
      const { data: free } = await supabase.rpc('username_available', { p_username: username });
      if (free === false) { setMsg(t('onboarding.account.taken')); return; }
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username, language } } });
      if (error) { setMsg(error.message); return; }
      if (!data.session) { setMsg(t('onboarding.account.check')); return; }
      await syncOnboarding();
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
      {mode === 'signup' ? (
        <>
          <Field label={t('onboarding.account.username')} value={username} onChangeText={(s) => setUsername(s.toLowerCase())} maxLength={20} />
          {username.length > 0 && !USERNAME.test(username) ? <Text variant="caption" color={colors.danger}>{t('onboarding.account.invalid')}</Text> : null}
        </>
      ) : null}
      <Field label={t('onboarding.account.email')} value={email} onChangeText={setEmail} keyboardType="email-address" textContentType="emailAddress" />
      <Field label={t('onboarding.account.password')} value={password} onChangeText={setPassword} secureTextEntry textContentType={mode === 'signup' ? 'newPassword' : 'password'} />
      {msg ? <Text variant="caption" color={colors.warning} accessibilityLiveRegion="polite">{msg}</Text> : null}
      <Button label={t(mode === 'signup' ? 'onboarding.account.create' : 'onboarding.account.signIn')} onPress={mode === 'signup' ? create : signIn} disabled={!valid} loading={busy} />
      <Button label={t(mode === 'signup' ? 'onboarding.account.haveAccount' : 'onboarding.account.noAccount')} variant="secondary" size="m"
        onPress={() => { setMsg(null); setMode(mode === 'signup' ? 'signin' : 'signup'); }} />
      <Button label={t('onboarding.account.later')} variant="ghost" onPress={onDone} />
    </View>
  );
}
