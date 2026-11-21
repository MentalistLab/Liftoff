import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Screen, Text } from '../../components/ui';
import { colors } from '../../theme';

export default function TrainScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('train.title')}>
      <Card><Text color={colors.textTertiary}>{t('common.soon')}</Text></Card>
    </Screen>
  );
}
