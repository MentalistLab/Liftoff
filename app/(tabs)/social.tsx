import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FriendsView } from '../../components/social/FriendsView';
import { GlobalView } from '../../components/social/GlobalView';
import { LeagueView } from '../../components/social/LeagueView';
import { Screen, SegmentedControl } from '../../components/ui';
import { useSocialRealtime } from '../../hooks/useSocial';

export default function SocialScreen() {
  const { t } = useTranslation();
  useSocialRealtime();
  const [tab, setTab] = useState<'league' | 'friends' | 'global'>('league');
  return (
    <Screen title={t('social.title')}>
      <SegmentedControl options={[{ value: 'league', label: t('social.league') }, { value: 'friends', label: t('social.friends') }, { value: 'global', label: t('social.global') }]} value={tab} onChange={setTab} />
      {tab === 'league' ? <LeagueView /> : tab === 'friends' ? <FriendsView /> : <GlobalView />}
    </Screen>
  );
}
