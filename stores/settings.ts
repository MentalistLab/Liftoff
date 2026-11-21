import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import i18n, { deviceLanguage, type Lang } from '../lib/i18n';

interface SettingsState {
  language: Lang;
  unitSystem: 'metric' | 'imperial';
  setLanguage: (l: Lang) => void;
  setUnitSystem: (u: 'metric' | 'imperial') => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: deviceLanguage(),
      unitSystem: 'metric',
      setLanguage: (language) => { i18n.changeLanguage(language); set({ language }); },
      setUnitSystem: (unitSystem) => set({ unitSystem }),
    }),
    {
      name: 'ascend-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (s) => { if (s) i18n.changeLanguage(s.language); },
    },
  ),
);
