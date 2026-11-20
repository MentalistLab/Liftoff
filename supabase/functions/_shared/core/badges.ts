// Abzeichen. Die Definitionen werden in Phase 3 auch in die Tabelle `badges` geseedet.

export interface BadgeStats {
  workouts: number;
  setsTotal: number;
  totalVolumeKg: number;
  longestStreak: number;
  maxWeightKg: number;
  prs: number;
  rankUps: number;
  highestTier: number; // 0 = noch kein Rang, 1 = Eisen … 8 = Titan
  friends: number;
  leaguePromotions: number;
  bestLeagueTier: number; // 1 … 10
  reactionsGiven: number;
}

export interface BadgeDef {
  id: string;
  nameDe: string;
  nameEn: string;
  descDe: string;
  descEn: string;
  category: 'training' | 'streak' | 'strength' | 'rank' | 'social' | 'league';
  check: (s: BadgeStats) => boolean;
}

const b = (
  id: string, category: BadgeDef['category'], nameDe: string, nameEn: string, descDe: string, descEn: string, check: (s: BadgeStats) => boolean,
): BadgeDef => ({ id, category, nameDe, nameEn, descDe, descEn, check });

const TIERS_DE = ['Eisen', 'Bronze', 'Silber', 'Gold', 'Platin', 'Diamant', 'Meister', 'Titan'];
const TIERS_EN = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Titan'];

export const BADGES: BadgeDef[] = [
  b('first_workout', 'training', 'Erster Schritt', 'First Step', 'Dein erstes Workout abgeschlossen.', 'Finished your first workout.', (s) => s.workouts >= 1),
  b('workouts_10', 'training', 'Dranbleiber', 'Regular', '10 Workouts abgeschlossen.', 'Finished 10 workouts.', (s) => s.workouts >= 10),
  b('workouts_50', 'training', 'Eisenhart', 'Iron Will', '50 Workouts abgeschlossen.', 'Finished 50 workouts.', (s) => s.workouts >= 50),
  b('workouts_100', 'training', 'Hundertschaft', 'Centurion', '100 Workouts abgeschlossen.', 'Finished 100 workouts.', (s) => s.workouts >= 100),
  b('workouts_250', 'training', 'Lebensstil', 'Lifestyle', '250 Workouts abgeschlossen.', 'Finished 250 workouts.', (s) => s.workouts >= 250),
  b('sets_1000', 'training', 'Tausend Sätze', 'Thousand Sets', '1.000 Sätze abgehakt.', 'Logged 1,000 sets.', (s) => s.setsTotal >= 1000),
  b('volume_10t', 'training', '10 Tonnen', '10 Tons', '10.000 kg Gesamtvolumen bewegt.', 'Moved 10,000 kg in total.', (s) => s.totalVolumeKg >= 10_000),
  b('volume_100t', 'training', '100 Tonnen', '100 Tons', '100.000 kg Gesamtvolumen bewegt.', 'Moved 100,000 kg in total.', (s) => s.totalVolumeKg >= 100_000),
  b('volume_1000t', 'training', 'Bergversetzer', 'Mountain Mover', '1.000.000 kg Gesamtvolumen bewegt.', 'Moved 1,000,000 kg in total.', (s) => s.totalVolumeKg >= 1_000_000),
  b('streak_7', 'streak', 'Wochenfeuer', 'Week on Fire', '7 Tage Streak.', '7-day streak.', (s) => s.longestStreak >= 7),
  b('streak_30', 'streak', 'Monatsflamme', 'Month Flame', '30 Tage Streak.', '30-day streak.', (s) => s.longestStreak >= 30),
  b('streak_100', 'streak', 'Unaufhaltsam', 'Unstoppable', '100 Tage Streak.', '100-day streak.', (s) => s.longestStreak >= 100),
  b('streak_365', 'streak', 'Ein ganzes Jahr', 'Full Year', '365 Tage Streak.', '365-day streak.', (s) => s.longestStreak >= 365),
  b('club_60', 'strength', '60-kg-Club', '60 kg Club', 'Mindestens 60 kg in einer Übung bewegt.', 'Lifted at least 60 kg in one exercise.', (s) => s.maxWeightKg >= 60),
  b('club_100', 'strength', '100-kg-Club', '100 kg Club', 'Mindestens 100 kg in einer Übung bewegt.', 'Lifted at least 100 kg in one exercise.', (s) => s.maxWeightKg >= 100),
  b('club_140', 'strength', '140-kg-Club', '140 kg Club', 'Mindestens 140 kg in einer Übung bewegt.', 'Lifted at least 140 kg in one exercise.', (s) => s.maxWeightKg >= 140),
  b('club_180', 'strength', '180-kg-Club', '180 kg Club', 'Mindestens 180 kg in einer Übung bewegt.', 'Lifted at least 180 kg in one exercise.', (s) => s.maxWeightKg >= 180),
  b('club_220', 'strength', '220-kg-Club', '220 kg Club', 'Mindestens 220 kg in einer Übung bewegt.', 'Lifted at least 220 kg in one exercise.', (s) => s.maxWeightKg >= 220),
  b('pr_1', 'strength', 'Neuer Bestwert', 'New Best', 'Deinen ersten persönlichen Rekord aufgestellt.', 'Set your first personal record.', (s) => s.prs >= 1),
  b('pr_10', 'strength', 'Rekordjäger', 'Record Hunter', '10 persönliche Rekorde.', '10 personal records.', (s) => s.prs >= 10),
  b('pr_50', 'strength', 'Rekordmaschine', 'Record Machine', '50 persönliche Rekorde.', '50 personal records.', (s) => s.prs >= 50),
  b('rankups_25', 'rank', 'Kletterer', 'Climber', '25 Rang-Aufstiege bei Übungen.', '25 exercise rank-ups.', (s) => s.rankUps >= 25),
  ...TIERS_DE.slice(1).map((t, i) =>
    b(`rank_${TIERS_EN[i + 1].toLowerCase()}`, 'rank', `${t} erreicht`, `${TIERS_EN[i + 1]} reached`, `Bei einer Übung den Rang ${t} erreicht.`, `Reached ${TIERS_EN[i + 1]} in an exercise.`, (s) => s.highestTier >= i + 2),
  ),
  b('friends_1', 'social', 'Trainingspartner', 'Training Buddy', 'Deinen ersten Freund hinzugefügt.', 'Added your first friend.', (s) => s.friends >= 1),
  b('friends_10', 'social', 'Crew', 'Crew', '10 Freunde.', '10 friends.', (s) => s.friends >= 10),
  b('reactions_50', 'social', 'Anfeuerer', 'Hype Machine', '50 Reaktionen an Freunde verteilt.', 'Gave 50 reactions to friends.', (s) => s.reactionsGiven >= 50),
  b('league_up_1', 'league', 'Aufsteiger', 'Promoted', 'Zum ersten Mal in der Liga aufgestiegen.', 'Promoted in the league for the first time.', (s) => s.leaguePromotions >= 1),
  b('league_up_5', 'league', 'Serienaufsteiger', 'Serial Climber', '5 Liga-Aufstiege.', '5 league promotions.', (s) => s.leaguePromotions >= 5),
  b('league_gold', 'league', 'Goldliga', 'Gold League', 'Die Gold-Liga erreicht.', 'Reached the Gold league.', (s) => s.bestLeagueTier >= 4),
  b('league_top', 'league', 'Gipfel', 'Summit', 'Die höchste Liga erreicht.', 'Reached the top league.', (s) => s.bestLeagueTier >= 10),
];

/** Liefert die IDs aller Abzeichen, die mit diesen Werten neu freigeschaltet sind. */
export function newlyEarnedBadges(stats: BadgeStats, alreadyEarned: Iterable<string>): string[] {
  const have = new Set(alreadyEarned);
  return BADGES.filter((x) => !have.has(x.id) && x.check(stats)).map((x) => x.id);
}
