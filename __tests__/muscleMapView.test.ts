import { figureFor, muscleFill, musclePaths, viewBoxFor } from '../lib/muscleMapView.ts';
import { TIER_COLORS } from '../lib/ranking.ts';
import { MUSCLES } from '../lib/standards.ts';

describe('Muskelkarte', () => {
  test('„Keine Angabe“ nutzt die männliche Figur', () => {
    expect(figureFor('none')).toBe('male');
    expect(figureFor('female')).toBe('female');
  });

  test('viewBox: vorne + hinten ergeben zusammen die ganze Figur', () => {
    for (const g of ['male', 'female'] as const) {
      const both = viewBoxFor(g, 'both'), front = viewBoxFor(g, 'front'), back = viewBoxFor(g, 'back');
      expect(front.x).toBe(both.x);
      expect(front.x + front.width).toBe(back.x);
      expect(back.x + back.width).toBe(both.x + both.width);
      expect(both.height).toBe(935);
    }
  });

  test('ohne Score keine Füllung', () => {
    expect(muscleFill(null).color).toBeNull();
    expect(muscleFill(undefined).opacity).toBe(0);
    expect(muscleFill(NaN).color).toBeNull();
  });

  test('Score → Rang-Farbe und Deckkraft je Division', () => {
    expect(muscleFill(0)).toMatchObject({ color: TIER_COLORS[0], tier: 1, division: 1 });
    expect(muscleFill(100)).toMatchObject({ color: TIER_COLORS[7], tier: 8, division: 3 });
    expect(muscleFill(scoreDiv(3, 3)).opacity).toBeGreaterThan(muscleFill(scoreDiv(3, 1)).opacity);
  });

  test('jede Muskelgruppe hat einen Pfad', () => {
    for (const g of ['male', 'female'] as const) {
      const p = musclePaths(g);
      expect(p.map((x) => x.muscle).sort()).toEqual([...MUSCLES].sort());
      for (const { d } of p) expect(d).toMatch(/^M[\d .MZ]+Z$/);
    }
  });
});

function scoreDiv(tier: number, division: number) {
  return (((tier - 1) * 3 + (division - 1)) * 100) / 24 + 1;
}
