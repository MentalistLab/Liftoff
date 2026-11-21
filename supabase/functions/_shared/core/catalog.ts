// Erweiterter Übungskatalog (≥ 80 Übungen). Wird von App und Seed importiert;
// Edge Functions lesen die Normen aus der Tabelle `exercises` und brauchen diese Datei nicht.
import { CORE_EXERCISES, registerExercises, type ExerciseDef, type Muscle, type RankingType } from './standards.ts';

// ───────────── Erweiterter Katalog ─────────────
// Normen: 5 Schwellen (Anfänger … Elite). weight_ratio = 1RM ÷ Körpergewicht (Kurzhantel: pro Hand),
// reps = Wiederholungen, time = Sekunden. Frauen-Normen: Oberkörper × 0,6, Unterkörper × 0,75 (wenn nicht angegeben).
type Row = [slug: string, de: string, en: string, primary: Muscle, secondary: Muscle[], equipment: ExerciseDef['equipment'], type: RankingType, male: number[], female?: number[]];

const LOWER = new Set<Muscle>(['legs', 'glutes']);
const r2 = (x: number) => Math.round(x * 100) / 100;
const row = ([slug, nameDe, nameEn, primaryMuscle, secondaryMuscles, equipment, rankingType, male, female]: Row): ExerciseDef => ({
  slug, nameDe, nameEn, primaryMuscle, secondaryMuscles, equipment, rankingType,
  standards: {
    male,
    female: female ?? (rankingType === 'weight_ratio'
      ? male.map((v) => r2(v * (LOWER.has(primaryMuscle) ? 0.75 : 0.6)))
      : rankingType === 'reps' ? male.map((v) => Math.round(v * (LOWER.has(primaryMuscle) ? 0.85 : 0.55))) : male),
  },
});

export const EXTRA_EXERCISES: ExerciseDef[] = ([
  // Brust
  ['incline_bench_press', 'Schrägbankdrücken', 'Incline Bench Press', 'chest', ['shoulders', 'triceps'], 'barbell', 'weight_ratio', [0.4, 0.65, 0.85, 1.25, 1.65]],
  ['decline_bench_press', 'Negativbankdrücken', 'Decline Bench Press', 'chest', ['triceps'], 'barbell', 'weight_ratio', [0.5, 0.8, 1.05, 1.5, 2.0]],
  ['close_grip_bench_press', 'Enges Bankdrücken', 'Close-Grip Bench Press', 'triceps', ['chest', 'shoulders'], 'barbell', 'weight_ratio', [0.4, 0.65, 0.9, 1.3, 1.7]],
  ['dumbbell_bench_press', 'Kurzhantel-Bankdrücken', 'Dumbbell Bench Press', 'chest', ['triceps', 'shoulders'], 'dumbbell', 'weight_ratio', [0.2, 0.32, 0.45, 0.65, 0.85]],
  ['incline_dumbbell_press', 'Schräges Kurzhanteldrücken', 'Incline Dumbbell Press', 'chest', ['shoulders', 'triceps'], 'dumbbell', 'weight_ratio', [0.17, 0.28, 0.4, 0.57, 0.75]],
  ['dumbbell_fly', 'Kurzhantel-Fliegende', 'Dumbbell Fly', 'chest', ['shoulders'], 'dumbbell', 'weight_ratio', [0.08, 0.14, 0.22, 0.32, 0.45]],
  ['machine_chest_press', 'Brustpresse (Maschine)', 'Machine Chest Press', 'chest', ['triceps', 'shoulders'], 'machine', 'weight_ratio', [0.5, 0.8, 1.1, 1.5, 2.0]],
  ['pec_deck', 'Butterfly (Maschine)', 'Pec Deck', 'chest', ['shoulders'], 'machine', 'weight_ratio', [0.35, 0.6, 0.9, 1.25, 1.65]],
  ['cable_crossover', 'Kabelzug-Crossover', 'Cable Crossover', 'chest', ['shoulders'], 'cable', 'weight_ratio', [0.12, 0.22, 0.35, 0.5, 0.7]],
  ['diamond_push_up', 'Diamant-Liegestütze', 'Diamond Push-up', 'triceps', ['chest'], 'bodyweight', 'reps', [3, 10, 20, 35, 50]],
  ['incline_push_up', 'Erhöhte Liegestütze', 'Incline Push-up', 'chest', ['triceps'], 'bodyweight', 'reps', [8, 20, 35, 55, 75], [5, 12, 25, 40, 60]],
  ['decline_push_up', 'Negativ-Liegestütze', 'Decline Push-up', 'chest', ['shoulders', 'triceps'], 'bodyweight', 'reps', [3, 12, 25, 40, 55]],
  // Rücken
  ['chin_up', 'Klimmzüge (Untergriff)', 'Chin-up', 'back', ['biceps'], 'bodyweight', 'reps', [1, 6, 13, 22, 32], [0, 2, 6, 13, 21]],
  ['lat_pulldown', 'Latzug', 'Lat Pulldown', 'back', ['biceps'], 'cable', 'weight_ratio', [0.5, 0.75, 1.0, 1.3, 1.6], [0.3, 0.5, 0.7, 0.95, 1.2]],
  ['seated_cable_row', 'Rudern am Kabel', 'Seated Cable Row', 'back', ['biceps'], 'cable', 'weight_ratio', [0.5, 0.8, 1.05, 1.4, 1.8], [0.3, 0.5, 0.75, 1.0, 1.3]],
  ['dumbbell_row', 'Einarmiges Kurzhantelrudern', 'One-Arm Dumbbell Row', 'back', ['biceps'], 'dumbbell', 'weight_ratio', [0.2, 0.35, 0.5, 0.75, 1.0], [0.12, 0.22, 0.33, 0.5, 0.7]],
  ['t_bar_row', 'T-Bar-Rudern', 'T-Bar Row', 'back', ['biceps'], 'barbell', 'weight_ratio', [0.5, 0.75, 1.0, 1.4, 1.8]],
  ['pendlay_row', 'Pendlay-Rudern', 'Pendlay Row', 'back', ['biceps'], 'barbell', 'weight_ratio', [0.45, 0.7, 0.95, 1.35, 1.7]],
  ['inverted_row', 'Australische Klimmzüge', 'Inverted Row', 'back', ['biceps'], 'bodyweight', 'reps', [3, 10, 18, 28, 40], [2, 6, 12, 20, 30]],
  ['rack_pull', 'Rack Pull', 'Rack Pull', 'back', ['glutes', 'legs'], 'barbell', 'weight_ratio', [1.2, 1.75, 2.3, 2.9, 3.5]],
  ['back_extension', 'Rückenstrecker', 'Back Extension', 'back', ['glutes'], 'bodyweight', 'reps', [8, 15, 25, 40, 60], [6, 12, 22, 35, 50]],
  ['straight_arm_pulldown', 'Überzüge am Kabel', 'Straight-Arm Pulldown', 'back', ['shoulders'], 'cable', 'weight_ratio', [0.2, 0.35, 0.5, 0.7, 0.9]],
  ['face_pull', 'Face Pulls', 'Face Pull', 'shoulders', ['back'], 'cable', 'weight_ratio', [0.2, 0.32, 0.45, 0.62, 0.8]],
  ['shrug', 'Shrugs (Langhantel)', 'Barbell Shrug', 'back', [], 'barbell', 'weight_ratio', [0.75, 1.15, 1.6, 2.1, 2.7]],
  // Schultern
  ['dumbbell_shoulder_press', 'Kurzhantel-Schulterdrücken', 'Dumbbell Shoulder Press', 'shoulders', ['triceps'], 'dumbbell', 'weight_ratio', [0.13, 0.22, 0.32, 0.45, 0.6]],
  ['arnold_press', 'Arnold Press', 'Arnold Press', 'shoulders', ['triceps'], 'dumbbell', 'weight_ratio', [0.11, 0.19, 0.28, 0.4, 0.52]],
  ['push_press', 'Push Press', 'Push Press', 'shoulders', ['triceps', 'legs'], 'barbell', 'weight_ratio', [0.45, 0.7, 1.0, 1.3, 1.65]],
  ['lateral_raise', 'Seitheben', 'Lateral Raise', 'shoulders', [], 'dumbbell', 'weight_ratio', [0.05, 0.09, 0.14, 0.2, 0.28]],
  ['front_raise', 'Frontheben', 'Front Raise', 'shoulders', ['chest'], 'dumbbell', 'weight_ratio', [0.06, 0.1, 0.15, 0.22, 0.3]],
  ['rear_delt_fly', 'Reverse Flys', 'Rear Delt Fly', 'shoulders', ['back'], 'dumbbell', 'weight_ratio', [0.05, 0.09, 0.14, 0.2, 0.27]],
  ['machine_shoulder_press', 'Schulterpresse (Maschine)', 'Machine Shoulder Press', 'shoulders', ['triceps'], 'machine', 'weight_ratio', [0.3, 0.5, 0.75, 1.0, 1.3]],
  ['upright_row', 'Aufrechtes Rudern', 'Upright Row', 'shoulders', ['back'], 'barbell', 'weight_ratio', [0.3, 0.45, 0.65, 0.85, 1.1]],
  ['pike_push_up', 'Pike-Liegestütze', 'Pike Push-up', 'shoulders', ['triceps'], 'bodyweight', 'reps', [2, 8, 15, 25, 40]],
  ['handstand_push_up', 'Handstand-Liegestütze', 'Handstand Push-up', 'shoulders', ['triceps'], 'bodyweight', 'reps', [0, 1, 5, 12, 20], [0, 0, 2, 6, 12]],
  // Bizeps
  ['dumbbell_curl', 'Kurzhantel-Curl', 'Dumbbell Curl', 'biceps', [], 'dumbbell', 'weight_ratio', [0.1, 0.17, 0.25, 0.36, 0.48]],
  ['hammer_curl', 'Hammer-Curl', 'Hammer Curl', 'biceps', [], 'dumbbell', 'weight_ratio', [0.11, 0.19, 0.28, 0.4, 0.52]],
  ['preacher_curl', 'Scott-Curl', 'Preacher Curl', 'biceps', [], 'barbell', 'weight_ratio', [0.18, 0.33, 0.5, 0.7, 0.95]],
  ['cable_curl', 'Kabel-Curl', 'Cable Curl', 'biceps', [], 'cable', 'weight_ratio', [0.2, 0.35, 0.5, 0.7, 0.9]],
  ['concentration_curl', 'Konzentrations-Curl', 'Concentration Curl', 'biceps', [], 'dumbbell', 'weight_ratio', [0.08, 0.14, 0.21, 0.3, 0.4]],
  ['ez_bar_curl', 'SZ-Curl', 'EZ-Bar Curl', 'biceps', [], 'barbell', 'weight_ratio', [0.2, 0.38, 0.55, 0.78, 1.05]],
  // Trizeps
  ['triceps_pushdown', 'Trizepsdrücken am Kabel', 'Triceps Pushdown', 'triceps', [], 'cable', 'weight_ratio', [0.25, 0.45, 0.65, 0.9, 1.2]],
  ['skull_crusher', 'French Press (SZ)', 'Skull Crusher', 'triceps', [], 'barbell', 'weight_ratio', [0.15, 0.3, 0.45, 0.65, 0.9]],
  ['overhead_triceps_extension', 'Trizeps-Überkopfstrecken', 'Overhead Triceps Extension', 'triceps', [], 'dumbbell', 'weight_ratio', [0.12, 0.22, 0.33, 0.48, 0.65]],
  ['bench_dip', 'Dips an der Bank', 'Bench Dip', 'triceps', ['chest'], 'bodyweight', 'reps', [5, 15, 25, 40, 60], [3, 10, 20, 32, 45]],
  ['triceps_kickback', 'Trizeps-Kickback', 'Triceps Kickback', 'triceps', [], 'dumbbell', 'weight_ratio', [0.05, 0.09, 0.14, 0.2, 0.27]],
  // Beine
  ['front_squat', 'Frontkniebeuge', 'Front Squat', 'legs', ['core', 'glutes'], 'barbell', 'weight_ratio', [0.6, 1.0, 1.25, 1.85, 2.3]],
  ['goblet_squat', 'Goblet Squat', 'Goblet Squat', 'legs', ['glutes', 'core'], 'kettlebell', 'weight_ratio', [0.2, 0.35, 0.5, 0.7, 0.9]],
  ['leg_press', 'Beinpresse', 'Leg Press', 'legs', ['glutes'], 'machine', 'weight_ratio', [1.0, 1.75, 2.5, 3.5, 4.5]],
  ['hack_squat', 'Hackenschmidt-Kniebeuge', 'Hack Squat', 'legs', ['glutes'], 'machine', 'weight_ratio', [0.6, 1.0, 1.5, 2.1, 2.7]],
  ['bulgarian_split_squat', 'Bulgarische Kniebeuge', 'Bulgarian Split Squat', 'legs', ['glutes'], 'dumbbell', 'weight_ratio', [0.1, 0.2, 0.32, 0.45, 0.6]],
  ['walking_lunge', 'Ausfallschritte (gehend)', 'Walking Lunge', 'legs', ['glutes'], 'dumbbell', 'weight_ratio', [0.1, 0.2, 0.3, 0.42, 0.55]],
  ['romanian_deadlift', 'Rumänisches Kreuzheben', 'Romanian Deadlift', 'legs', ['glutes', 'back'], 'barbell', 'weight_ratio', [0.6, 1.0, 1.4, 1.9, 2.4]],
  ['sumo_deadlift', 'Sumo-Kreuzheben', 'Sumo Deadlift', 'legs', ['glutes', 'back'], 'barbell', 'weight_ratio', [1.0, 1.5, 2.0, 2.5, 3.0], [0.5, 1.0, 1.25, 1.75, 2.5]],
  ['leg_extension', 'Beinstrecker', 'Leg Extension', 'legs', [], 'machine', 'weight_ratio', [0.4, 0.7, 1.0, 1.4, 1.8]],
  ['leg_curl', 'Beinbeuger', 'Leg Curl', 'legs', [], 'machine', 'weight_ratio', [0.3, 0.5, 0.75, 1.05, 1.35]],
  ['standing_calf_raise', 'Wadenheben stehend', 'Standing Calf Raise', 'legs', [], 'machine', 'weight_ratio', [0.6, 1.0, 1.5, 2.1, 2.8]],
  ['seated_calf_raise', 'Wadenheben sitzend', 'Seated Calf Raise', 'legs', [], 'machine', 'weight_ratio', [0.4, 0.7, 1.0, 1.4, 1.9]],
  ['bodyweight_squat', 'Kniebeuge ohne Gewicht', 'Bodyweight Squat', 'legs', ['glutes'], 'bodyweight', 'reps', [15, 30, 50, 75, 100], [12, 25, 45, 70, 95]],
  ['pistol_squat', 'Pistol Squat (je Bein)', 'Pistol Squat (per leg)', 'legs', ['glutes', 'core'], 'bodyweight', 'reps', [0, 1, 5, 12, 20], [0, 1, 4, 10, 18]],
  ['jump_squat', 'Sprungkniebeuge', 'Jump Squat', 'legs', ['glutes'], 'bodyweight', 'reps', [8, 15, 25, 40, 55]],
  ['step_up', 'Step-ups', 'Step-up', 'legs', ['glutes'], 'dumbbell', 'weight_ratio', [0.1, 0.2, 0.3, 0.42, 0.55]],
  ['wall_sit', 'Wandsitzen', 'Wall Sit', 'legs', ['glutes'], 'bodyweight', 'time', [30, 60, 100, 150, 240]],
  // Gesäß
  ['glute_bridge', 'Glute Bridge', 'Glute Bridge', 'glutes', ['legs'], 'barbell', 'weight_ratio', [0.4, 0.8, 1.2, 1.75, 2.3], [0.4, 0.8, 1.2, 1.6, 2.2]],
  ['cable_kickback', 'Kickbacks am Kabel', 'Cable Kickback', 'glutes', [], 'cable', 'weight_ratio', [0.1, 0.2, 0.3, 0.42, 0.55], [0.1, 0.18, 0.28, 0.4, 0.52]],
  ['hip_abduction', 'Abduktoren (Maschine)', 'Hip Abduction', 'glutes', [], 'machine', 'weight_ratio', [0.4, 0.7, 1.0, 1.35, 1.75], [0.4, 0.65, 0.95, 1.3, 1.65]],
  ['kettlebell_swing', 'Kettlebell Swing', 'Kettlebell Swing', 'glutes', ['legs', 'back'], 'kettlebell', 'weight_ratio', [0.2, 0.32, 0.45, 0.6, 0.8]],
  ['single_leg_glute_bridge', 'Einbeinige Glute Bridge', 'Single-Leg Glute Bridge', 'glutes', ['legs'], 'bodyweight', 'reps', [5, 12, 20, 30, 45], [5, 12, 20, 30, 45]],
  // Core
  ['side_plank', 'Seitstütz', 'Side Plank', 'core', [], 'bodyweight', 'time', [15, 30, 60, 100, 150]],
  ['hanging_leg_raise', 'Beinheben hängend', 'Hanging Leg Raise', 'core', [], 'bodyweight', 'reps', [2, 6, 12, 20, 30], [1, 4, 9, 15, 24]],
  ['ab_wheel_rollout', 'Ab-Roller', 'Ab Wheel Rollout', 'core', ['shoulders'], 'bodyweight', 'reps', [1, 5, 12, 20, 30], [0, 3, 8, 15, 22]],
  ['crunch', 'Crunches', 'Crunch', 'core', [], 'bodyweight', 'reps', [10, 25, 45, 70, 100], [10, 25, 45, 70, 100]],
  ['russian_twist', 'Russian Twist', 'Russian Twist', 'core', [], 'bodyweight', 'reps', [10, 25, 45, 70, 100], [10, 25, 45, 70, 100]],
  ['cable_crunch', 'Kabel-Crunch', 'Cable Crunch', 'core', [], 'cable', 'weight_ratio', [0.3, 0.55, 0.8, 1.1, 1.45]],
  ['hollow_hold', 'Hollow Hold', 'Hollow Hold', 'core', [], 'bodyweight', 'time', [10, 25, 45, 75, 120]],
  ['l_sit', 'L-Sitz', 'L-Sit', 'core', ['triceps'], 'bodyweight', 'time', [3, 10, 20, 35, 60], [2, 7, 15, 28, 45]],
  ['mountain_climber', 'Bergsteiger', 'Mountain Climber', 'core', ['shoulders', 'legs'], 'bodyweight', 'reps', [15, 30, 50, 75, 100], [15, 30, 50, 75, 100]],
] as Row[]).map(row);

export const ALL_EXERCISES: ExerciseDef[] = [...CORE_EXERCISES, ...EXTRA_EXERCISES];
registerExercises(EXTRA_EXERCISES);
