import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Screen, SegmentedControl, Text } from '../../components/ui';
import { useSettings } from '../../stores/settings';
import { space } from '../../theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { language, setLanguage } = useSettings();
  return (
    <Screen title={t('profile.title')}>
      <Card style={{ gap: space[3] }}>
        <Text variant="h3">{t('profile.language')}</Text>
        <SegmentedControl options={[{ value: 'de', label: 'Deutsch' }, { value: 'en', label: 'English' }]} value={language} onChange={setLanguage} />
      </Card>
    </Screen>
  );
}
