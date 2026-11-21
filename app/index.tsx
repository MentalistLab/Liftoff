import { Redirect } from 'expo-router';
import React from 'react';
import { useOnboarding } from '../stores/onboarding';

export default function Index() {
  const completed = useOnboarding((s) => s.completed);
  return <Redirect href={completed ? '/home' : '/onboarding'} />;
}
