export type Muscle = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'legs' | 'glutes' | 'core';
export type RankingType = 'weight_ratio' | 'reps' | 'time';

export interface Exercise {
  id: string;
  name: string;
  muscle: Muscle;
  type: RankingType;
  /**
   * 9 Schwellenwerte für Männer um die 25 Jahre:
   * Index 0 = Start von Eisen (0), Index 1 = Start von Bronze, … Index 7 = Start von Titan,
   * Index 8 = Wert für 100 Punkte (Maximum).
   * weight_ratio: 1RM / Körpergewicht · reps: Wiederholungen · time: Sekunden
   */
  standards: readonly number[];
}

export const MUSCLES: readonly Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'core'];

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: 'Brust',
  back: 'Rücken',
  shoulders: 'Schultern',
  biceps: 'Bizeps',
  triceps: 'Trizeps',
  legs: 'Beine',
  glutes: 'Gesäß',
  core: 'Core',
};

export const EXERCISES: readonly Exercise[] = [
  { id: 'bench', name: 'Bankdrücken', muscle: 'chest', type: 'weight_ratio', standards: [0, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.4] },
  { id: 'pushup', name: 'Liegestütze', muscle: 'chest', type: 'reps', standards: [0, 5, 10, 20, 30, 40, 55, 70, 100] },
  { id: 'row', name: 'Langhantelrudern', muscle: 'back', type: 'weight_ratio', standards: [0, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.9] },
  { id: 'pullup', name: 'Klimmzüge', muscle: 'back', type: 'reps', standards: [0, 1, 4, 8, 12, 16, 20, 25, 35] },
  { id: 'ohp', name: 'Schulterdrücken', muscle: 'shoulders', type: 'weight_ratio', standards: [0, 0.35, 0.5, 0.65, 0.8, 0.95, 1.1, 1.25, 1.5] },
  { id: 'lateral', name: 'Seitheben', muscle: 'shoulders', type: 'weight_ratio', standards: [0, 0.1, 0.15, 0.2, 0.28, 0.35, 0.42, 0.5, 0.65] },
  { id: 'curl', name: 'Langhantel-Curl', muscle: 'biceps', type: 'weight_ratio', standards: [0, 0.2, 0.3, 0.4, 0.55, 0.7, 0.85, 1.0, 1.2] },
  { id: 'dip', name: 'Dips', muscle: 'triceps', type: 'reps', standards: [0, 3, 8, 15, 22, 30, 40, 50, 70] },
  { id: 'squat', name: 'Kniebeuge', muscle: 'legs', type: 'weight_ratio', standards: [0, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0] },
  { id: 'legpress', name: 'Beinpresse', muscle: 'legs', type: 'weight_ratio', standards: [0, 1.0, 1.5, 2.0, 2.7, 3.4, 4.0, 4.8, 6.0] },
  { id: 'deadlift', name: 'Kreuzheben', muscle: 'glutes', type: 'weight_ratio', standards: [0, 0.75, 1.0, 1.5, 1.75, 2.0, 2.5, 3.0, 3.5] },
  { id: 'hipthrust', name: 'Hip Thrust', muscle: 'glutes', type: 'weight_ratio', standards: [0, 0.75, 1.25, 1.75, 2.25, 2.75, 3.25, 3.75, 4.5] },
  { id: 'plank', name: 'Plank (Sekunden)', muscle: 'core', type: 'time', standards: [0, 20, 45, 75, 105, 150, 200, 260, 360] },
];

export const getExercise = (id: string): Exercise | undefined => EXERCISES.find((e) => e.id === id);
