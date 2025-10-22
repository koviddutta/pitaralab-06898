// lib/paste-core/aw.ts
export type SugarPortion = {
  kind: 'sucrose' | 'dextrose' | 'glucose_syrup';
  massFraction: number; // 0..1 of TOTAL mix (first pass)
};

const MW_SUCROSE = 342.3; // g/mol
const MW_WATER = 18.015;  // g/mol

export function awNorrishSucrose(moleFracSucrose: number, K = 6.47) {
  const X = Math.max(0, Math.min(1, moleFracSucrose));
  return (1 - X) * Math.exp(-K * X * X);
}

export function sucroseMoleFraction(gramsSucrose: number, gramsWater: number) {
  const nS = gramsSucrose / MW_SUCROSE;
  const nW = gramsWater / MW_WATER;
  const total = nS + nW;
  return total === 0 ? 0 : nS / total;
}

function awApproxForSugar(kind: SugarPortion['kind'], solidsFraction: number) {
  if (kind === 'sucrose') {
    const gS = 100 * solidsFraction;
    const gW = 100 - gS;
    const Xs = sucroseMoleFraction(gS, gW);
    return awNorrishSucrose(Xs);
  }
  if (kind === 'dextrose') {
    const base = 1 - 0.90 * solidsFraction;
    return Math.max(0.6, base);
  }
  if (kind === 'glucose_syrup') {
    const base = 1 - 1.05 * solidsFraction;
    return Math.max(0.6, base);
  }
  return 1.0;
}

export function awMixedSugars(parts: SugarPortion[]) {
  const total = parts.reduce((s, p) => s + p.massFraction, 0) || 1;
  return parts.reduce((acc, p) => {
    const Xi = p.massFraction / total;
    const awi = awApproxForSugar(p.kind, p.massFraction);
    return acc + awi * Xi;
  }, 0);
}
