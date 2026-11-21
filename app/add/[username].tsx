// Öffnet sich über Einladungslink oder QR-Code: sendet eine Freundschaftsanfrage.
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Button, Text } from '../../components/ui';
import { searchUsers, useFriendActions } from '../../hooks/useSocial';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { colors, space } from '../../theme';

export default function AddFriend() {
  const { t: tr } = useTranslation();
  const t = tr as unknown as (k: string, o?: object) => string;
  const { username = '' } = useLocalSearchParams<{ username: string }>();
  const name = String(username).toLowerCase();
  const { request } = useFriendActions();
  const [state, setState] = useState<'busy' | 'added' | 'notFound' | 'self' | 'signIn'>('busy');

  useEffect(() => {
    (async () => {
      const { data: { session } } = supabaseConfigured ? await supabase.auth.getSession() : { data: { session: null } };
      if (!session) { setState('signIn'); return; }
      const res = await searchUsers(name).catch(() => []);
      const u = res.find((x) => x.username.toLowerCase() === name);
      if (!u) {
        const me = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
        setState(me.data?.username === name ? 'self' : 'notFound');
        return;
      }
      if (u.friendship_status !== 'accepted') await request(u.id).catch(() => undefined);
      setState('added');
    })();
  }, [name, request]);

  const text = { busy: t('social.adding'), added: t('social.added', { name }), notFound: t('social.notFound', { name }), self: t('social.self'), signIn: t('social.signIn') }[state];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space[6], gap: space[5] }}>
      <Avatar name={name} size={88} />
      <Text variant="h2" style={{ textAlign: 'center' }} accessibilityLiveRegion="polite">{text}</Text>
      {state === 'busy' ? <ActivityIndicator color={colors.primary} /> : (
        <View style={{ alignSelf: 'stretch', gap: space[2] }}>
          {state === 'signIn' ? <Button label={t('profile.signIn')} onPress={() => router.replace({ pathname: '/onboarding', params: { step: 'account', mode: 'signin' } })} /> : null}
          <Button label={t('social.close')} variant={state === 'signIn' ? 'ghost' : 'primary'} onPress={() => router.replace('/social')} />
        </View>
      )}
    </SafeAreaView>
  );
}
