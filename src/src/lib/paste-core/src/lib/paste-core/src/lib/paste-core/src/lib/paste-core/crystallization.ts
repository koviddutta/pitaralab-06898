// lib/paste-core/crystallization.ts
export function sucroseCrystallizationRisk(sucrosePct:number){
  return sucrosePct > 65 ? 'High: add 20-30% of sugars as glucose/invert' : 'Low';
}
