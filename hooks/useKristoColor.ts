import { scoreToRank } from '../lib/ranking';
import { colors } from '../theme';
import { useMyRanks } from './useMyRanks';

/** Kristo trägt die Farbe des aktuellen Gesamtrangs (ohne Rang: Eisblau). */
export function useKristoColor(): string {
  const { data } = useMyRanks();
  return data?.overall != null ? colors.tiers[scoreToRank(data.overall).tier - 1] : colors.primary;
}
