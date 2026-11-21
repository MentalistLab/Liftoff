import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import i18n, { deviceLanguage, type Lang } from '../lib/i18n';

interface SettingsState {
  language: Lang;
  unitSystem: 'metric' | 'imperial';
  setLanguage: (l: Lang) => void;
  setUnitSystem: (u: 'metric' | 'imperial') => void;
  isPrivate: boolean;
  setPrivate: (v: boolean) => void;
  remindersEnabled: boolean;
  setReminders: (v: boolean) => void;
  /** Körpergewichts-Verlauf (für das Profil-Diagramm) */
  weightLog: { t: number; kg: number }[];
  logWeight: (kg: number) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: deviceLanguage(),
      unitSystem: 'metric',
      setLanguage: (language) => { i18n.changeLanguage(language); set({ language }); },
      setUnitSystem: (unitSystem) => set({ unitSystem }),
      isPrivate: false,
      setPrivate: (isPrivate) => set({ isPrivate }),
      remindersEnabled: false,
      setReminders: (remindersEnabled) => set({ remindersEnabled }),
      weightLog: [],
      logWeight: (kg) => set((s) => {
        // ein Eintrag pro Tag – gleicher Tag wird überschrieben
        const day = new Date().toDateString();
        const rest = s.weightLog.filter((e) => new Date(e.t).toDateString() !== day);
        return { weightLog: [...rest, { t: Date.now(), kg }].sort((a, b) => a.t - b.t).slice(-365) };
      }),
    }),
    {
      name: 'ascend-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (s) => { if (s) i18n.changeLanguage(s.language); },
    },
  ),
);
