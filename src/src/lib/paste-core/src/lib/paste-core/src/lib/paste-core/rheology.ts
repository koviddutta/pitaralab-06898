// lib/paste-core/rheology.ts
export type RheologyInputs = {
  oilPct: number;
  stabilizerPct: number;
  moisturePct: number;
  particleMedianUm: number;
};

export function predictYieldStressN(i: RheologyInputs): number {
  let tau0 = 100;
  tau0 -= 1.2 * Math.max(0, i.oilPct - 8);
  tau0 += 30 * i.stabilizerPct;
  tau0 += i.particleMedianUm < 50 ? 10 : 0;
  tau0 += (i.moisturePct > 35 ? -10 : 0);
  return Math.max(20, Math.round(tau0));
}

export function apparentViscosityPaS(
  tau0N: number, K: number, n: number, gdot: number
) {
  const tau = tau0N + K * Math.pow(gdot, n);
  return tau / gdot;
}
