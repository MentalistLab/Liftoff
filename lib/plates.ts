// Scheiben-Rechner: welche Hantelscheiben pro Seite für ein Zielgewicht.
export const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export interface PlateResult {
  /** Scheiben pro Seite, schwerste zuerst */
  perSide: number[];
  /** tatsächlich erreichtes Gesamtgewicht */
  total: number;
  /** was nicht aufgeht (z. B. 0,5 kg) */
  remainder: number;
}

export function platesFor(targetKg: number, barKg = 20, plates = DEFAULT_PLATES): PlateResult {
  const sorted = [...plates].sort((a, b) => b - a);
  let side = Math.max(0, (targetKg - barKg) / 2);
  const perSide: number[] = [];
  for (const p of sorted) {
    while (side >= p - 1e-9) { perSide.push(p); side = Math.round((side - p) * 1000) / 1000; }
  }
  const total = barKg + 2 * perSide.reduce((a, b) => a + b, 0);
  return { perSide, total: Math.round(total * 100) / 100, remainder: Math.round((targetKg - total) * 100) / 100 };
}

/** Farben angelehnt an übliche Wettkampfscheiben. */
export const PLATE_COLORS: Record<string, string> = {
  '25': '#E5484D', '20': '#3E8EF7', '15': '#F2C14E', '10': '#3DDC97', '5': '#F2F5F8', '2.5': '#9AA6B2', '1.25': '#7D8996',
};
