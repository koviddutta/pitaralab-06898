import { IngredientData } from '@/types/ingredients';
import { calcMetricsV2, MetricsV2, CalcOptionsV2 } from './calc.v2';

export type Row = { ing: IngredientData; grams: number; lock?: boolean; min?: number; max?: number; };

export type OptimizeTarget = Partial<{
  totalSugars_pct: number; sugars_pct: number; fat_pct: number; msnf_pct: number; ts_pct: number; fpdt: number;
}>;

function objective(m: MetricsV2, t: OptimizeTarget) {
  let s = 0;
  // Weight FPDT more heavily as it's critical for texture
  if (t.totalSugars_pct != null) s += Math.abs(m.totalSugars_pct - t.totalSugars_pct) * 1.0;
  if (t.sugars_pct      != null) s += Math.abs(m.nonLactoseSugars_pct - t.sugars_pct) * 1.0;
  if (t.fat_pct         != null) s += Math.abs(m.fat_pct - t.fat_pct) * 1.5;
  if (t.msnf_pct        != null) s += Math.abs(m.msnf_pct - t.msnf_pct) * 1.5;
  if (t.ts_pct          != null) s += Math.abs(m.ts_pct - t.ts_pct) * 1.0;
  if (t.fpdt            != null) s += Math.abs(m.fpdt - t.fpdt) * 2.0;
  return s;
}

export function optimizeRecipe(
  rowsIn: Row[],
  targets: OptimizeTarget,
  mode: 'gelato' | 'kulfi' = 'gelato',
  maxIters = 1000,
  step = 1.0
): Row[] {
  const rows = rowsIn.map(r => ({ ...r }));
  const opts: CalcOptionsV2 = { mode };
  
  let bestM = calcMetricsV2(rows, opts);
  let best = objective(bestM, targets);

  // Multi-phase optimization with decreasing step sizes
  const phases = [
    { iters: Math.floor(maxIters * 0.4), step: step * 5.0 },  // Coarse search
    { iters: Math.floor(maxIters * 0.4), step: step * 2.0 },  // Medium search
    { iters: Math.floor(maxIters * 0.2), step: step * 0.5 }   // Fine tuning
  ];

  for (const phase of phases) {
    for (let iter = 0; iter < phase.iters; iter++) {
      let improved = false;

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (r.lock) continue;

        for (const dir of [+1, -1]) {
          const test = rows.map(x => ({ ...x }));
          const next = Math.max(
            test[i].min ?? 0,
            Math.min(test[i].max ?? 1e9, test[i].grams + dir * phase.step)
          );
          if (Math.abs(next - test[i].grams) < 0.01) continue;
          test[i].grams = next;

          const m = calcMetricsV2(test, opts);
          const score = objective(m, targets);
          if (score + 1e-6 < best) {
            best = score; bestM = m;
            rows.splice(0, rows.length, ...test);
            improved = true;
          }
        }
      }
      if (!improved && phase.step <= 1.0) break; // Early exit for fine tuning only
    }
  }
  
  return rows;
}