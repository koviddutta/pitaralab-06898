import { IngredientData } from '@/types/ingredients';
import { calcMetricsV2, MetricsV2 } from './calc.v2';

export type Row = { ing: IngredientData; grams: number; lock?: boolean; min?: number; max?: number; };

export type OptimizeTarget = Partial<{
  totalSugars_pct: number; sugars_pct: number; fat_pct: number; msnf_pct: number; ts_pct: number; fpdt: number;
}>;

function objective(m: MetricsV2, t: OptimizeTarget) {
  let s = 0;
  if (t.totalSugars_pct != null) s += Math.abs(m.totalSugars_pct - t.totalSugars_pct);
  if (t.sugars_pct      != null) s += Math.abs(m.nonLactoseSugars_pct - t.sugars_pct);
  if (t.fat_pct         != null) s += Math.abs(m.fat_pct - t.fat_pct);
  if (t.msnf_pct        != null) s += Math.abs(m.msnf_pct - t.msnf_pct);
  if (t.ts_pct          != null) s += Math.abs(m.ts_pct - t.ts_pct);
  if (t.fpdt            != null) s += Math.abs(m.fpdt - t.fpdt);
  return s;
}

export function optimizeRecipe(
  rowsIn: Row[],
  targets: OptimizeTarget,
  maxIters = 200,
  step = 1
): Row[] {
  const rows = rowsIn.map(r => ({ ...r }));
  let bestM = calcMetricsV2(rows);
  let best = objective(bestM, targets);

  for (let iter = 0; iter < maxIters; iter++) {
    let improved = false;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.lock) continue;

      for (const dir of [+1, -1]) {
        const test = rows.map(x => ({ ...x }));
        const next = Math.max(
          test[i].min ?? 0,
          Math.min(test[i].max ?? 1e9, test[i].grams + dir * step)
        );
        if (next === test[i].grams) continue;
        test[i].grams = next;

        const m = calcMetricsV2(test);
        const score = objective(m, targets);
        if (score + 1e-6 < best) {
          best = score; bestM = m;
          rows.splice(0, rows.length, ...test);
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return rows;
}