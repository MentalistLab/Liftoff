// Warteschlange für Erfolgs-Modals (Rang-Aufstieg, Abzeichen, Liga-Ergebnis, Streak).
// Nicht persistiert: was beim Schließen der App noch offen war, wird beim nächsten Ereignis neu erzeugt.
import { create } from 'zustand';

export type Celebration =
  | { kind: 'rank_up'; slug: string; tier: number; division: number; fromTier?: number; fromDivision?: number }
  | { kind: 'badge'; id: string }
  | { kind: 'league'; result: 'promoted' | 'stayed' | 'demoted'; position: number | null; tier: number }
  | { kind: 'streak_lost'; lost: number }
  | { kind: 'streak_freeze'; freezes: number }
  | { kind: 'challenge'; id: string; target: number };

interface State {
  queue: Celebration[];
  push: (...c: Celebration[]) => void;
  pop: () => void;
}

export const useCelebrations = create<State>((set) => ({
  queue: [],
  push: (...c) => set((s) => ({ queue: [...s.queue, ...c] })),
  pop: () => set((s) => ({ queue: s.queue.slice(1) })),
}));
