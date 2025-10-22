// lib/paste-core/packaging.ts
export function recommendedPackaging(paste: 'rabri'|'gulab_jamun'|'jalebi'|'nutella'|'pistachio'){
  if (paste==='nutella') return {material:'Glass jar', treatment:'N2 flush', note:'~12 months @18-25C'};
  if (paste==='pistachio') return {material:'Metalized BOPP/LDPE', note:'~4-6 months @15-20C'};
  if (paste==='rabri') return {material:'Laminate/Tray', MAP:'70%N2/30%CO2', note:'~42 days @4-8C'};
  return {material:'Laminate pouch', MAP:'50%N2/50%CO2', note:'~30-40 days @5-10C'};
}
