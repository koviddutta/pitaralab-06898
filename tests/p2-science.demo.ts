/**
 * P2 Science Features Demo
 * Demonstrates fruit acidity, Brix calculations, overrun prediction, and serving temps
 */

import { adjustPACforAcids, effectiveBrixInMix, getFruitProfile, estimateNeutralizationNeed } from '@/lib/fruit.v1';
import { predictOverrun, suggestServingTemp, SERVING_TEMP_REFERENCE } from '@/lib/serving.v1';

// ============================================================================
// DEMO 1: Lemon Sorbet (High Acidity)
// ============================================================================

console.log('\n=== DEMO 1: Lemon Sorbet (High Acidity) ===\n');

const lemonSorbet = {
  acidityPct: 2.5,      // 2.5% citric acid
  brixPct: 8,           // 8% sugar in lemon puree
  fruitGrams: 300,      // 300g lemon puree
  totalMixGrams: 1000   // 1kg total mix
};

const lemonAnalysis = adjustPACforAcids(lemonSorbet);
console.log('Lemon Sorbet Analysis:');
console.log(`  Citric Acid: ${lemonAnalysis.acidGrams.toFixed(1)}g`);
console.log(`  PAC Impact: ${lemonAnalysis.deltaPAC.toFixed(2)} units`);
console.log('\nRecommendations:');
lemonAnalysis.notes.forEach(note => console.log(`  ${note}`));

if (lemonAnalysis.neutralizationNeed) {
  console.log('\nNeutralization Options:');
  console.log(`  Baking Soda: ${lemonAnalysis.neutralizationNeed.bakingSodaGrams.toFixed(1)}g`);
  console.log(`  Calcium Carbonate: ${lemonAnalysis.neutralizationNeed.calciumCarbonateGrams.toFixed(1)}g`);
  console.log(`  Reason: ${lemonAnalysis.neutralizationNeed.reason}`);
}

const lemonBrix = effectiveBrixInMix(lemonSorbet);
console.log('\nSugar from Fruit:');
console.log(`  Effective Brix: ${lemonBrix.effectiveBrix.toFixed(1)}%`);
console.log(`  Sugar contribution: ${lemonBrix.sugarFromFruitGrams.toFixed(1)}g (${lemonBrix.sugarFromFruitPct.toFixed(1)}%)`);

// ============================================================================
// DEMO 2: Mango Gelato (Low Acidity, High Brix)
// ============================================================================

console.log('\n\n=== DEMO 2: Mango Gelato (Low Acidity, High Brix) ===\n');

const mangoGelato = {
  acidityPct: 0.5,      // 0.5% citric acid
  brixPct: 15,          // 15% sugar in mango puree
  fruitGrams: 250,      // 250g mango puree
  totalMixGrams: 1000   // 1kg total mix
};

const mangoAnalysis = adjustPACforAcids(mangoGelato);
console.log('Mango Gelato Analysis:');
console.log(`  Citric Acid: ${mangoAnalysis.acidGrams.toFixed(1)}g`);
console.log(`  PAC Impact: ${mangoAnalysis.deltaPAC.toFixed(2)} units`);
console.log('\nRecommendations:');
mangoAnalysis.notes.forEach(note => console.log(`  ${note}`));

const mangoBrix = effectiveBrixInMix(mangoGelato);
console.log('\nSugar from Fruit:');
console.log(`  Effective Brix: ${mangoBrix.effectiveBrix.toFixed(1)}%`);
console.log(`  Sugar contribution: ${mangoBrix.sugarFromFruitGrams.toFixed(1)}g (${mangoBrix.sugarFromFruitPct.toFixed(1)}%)`);

// ============================================================================
// DEMO 3: Fruit Profile Lookup
// ============================================================================

console.log('\n\n=== DEMO 3: Fruit Profile Database ===\n');

const fruits = ['lemon', 'passion fruit', 'mango', 'strawberry'];
fruits.forEach(fruit => {
  const profile = getFruitProfile(fruit);
  if (profile) {
    console.log(`${fruit.toUpperCase()}:`);
    console.log(`  Typical acidity: ${profile.typicalAcidityPct}%`);
    console.log(`  Typical Brix: ${profile.typicalBrixPct}%`);
    console.log(`  PAC modifier: ${profile.pacModifier}x`);
    console.log(`  Notes: ${profile.notes}`);
    console.log('');
  }
});

// ============================================================================
// DEMO 4: Overrun Prediction - Batch Freezer
// ============================================================================

console.log('\n=== DEMO 4: Overrun Prediction (Batch Freezer) ===\n');

const batchRecipe = {
  fatPct: 8,
  tsPct: 36,
  stabilizerPct: 0.5,
  proteinPct: 4.5,
  processType: 'batch' as const,
  agingTimeHours: 12
};

const batchOverrun = predictOverrun(batchRecipe);
console.log(`Overrun Prediction: ${batchOverrun.estimatedPct.toFixed(0)}% (${batchOverrun.category})`);
console.log(`Range: ${batchOverrun.range.min.toFixed(0)}-${batchOverrun.range.max.toFixed(0)}%`);
console.log(`Confidence: ${batchOverrun.confidence.toUpperCase()}`);
console.log('\nAnalysis:');
batchOverrun.notes.forEach(note => console.log(`  ${note}`));

// ============================================================================
// DEMO 5: Overrun Prediction - Continuous Freezer
// ============================================================================

console.log('\n\n=== DEMO 5: Overrun Prediction (Continuous Freezer) ===\n');

const continuousRecipe = {
  fatPct: 12,
  tsPct: 38,
  stabilizerPct: 0.6,
  proteinPct: 4.0,
  processType: 'continuous' as const,
  agingTimeHours: 8
};

const continuousOverrun = predictOverrun(continuousRecipe);
console.log(`Overrun Prediction: ${continuousOverrun.estimatedPct.toFixed(0)}% (${continuousOverrun.category})`);
console.log(`Range: ${continuousOverrun.range.min.toFixed(0)}-${continuousOverrun.range.max.toFixed(0)}%`);
console.log(`Confidence: ${continuousOverrun.confidence.toUpperCase()}`);
console.log('\nAnalysis:');
continuousOverrun.notes.forEach(note => console.log(`  ${note}`));

// ============================================================================
// DEMO 6: Serving Temperature - Gelato
// ============================================================================

console.log('\n\n=== DEMO 6: Serving Temperature Guidance (Gelato) ===\n');

const gelatoComp = {
  fpdtC: 2.8,
  fatPct: 8,
  sugarsPct: 18,
  overrunPct: 35,
  productType: 'gelato' as const
};

const gelatoTemp = suggestServingTemp(gelatoComp);
console.log('Temperature Recommendations:');
console.log(`  Draw from machine: ${gelatoTemp.drawTempC.toFixed(1)}°C`);
console.log(`  Serve immediately: ${gelatoTemp.serveTempC.toFixed(1)}°C`);
console.log(`  Storage: ${gelatoTemp.storeTempC}°C`);
console.log(`  Hardening time: ${gelatoTemp.hardeningTimeHours} hours`);
console.log('\nGuidance:');
gelatoTemp.notes.forEach(note => console.log(`  ${note}`));

// ============================================================================
// DEMO 7: Serving Temperature - Sorbet
// ============================================================================

console.log('\n\n=== DEMO 7: Serving Temperature Guidance (Sorbet) ===\n');

const sorbetComp = {
  fpdtC: 3.2,
  fatPct: 0,
  sugarsPct: 24,
  overrunPct: 20,
  productType: 'sorbet' as const
};

const sorbetTemp = suggestServingTemp(sorbetComp);
console.log('Temperature Recommendations:');
console.log(`  Draw from machine: ${sorbetTemp.drawTempC.toFixed(1)}°C`);
console.log(`  Serve immediately: ${sorbetTemp.serveTempC.toFixed(1)}°C`);
console.log(`  Storage: ${sorbetTemp.storeTempC}°C`);
console.log(`  Hardening time: ${sorbetTemp.hardeningTimeHours} hours`);
console.log('\nGuidance:');
sorbetTemp.notes.forEach(note => console.log(`  ${note}`));

// ============================================================================
// DEMO 8: Quick Reference
// ============================================================================

console.log('\n\n=== DEMO 8: Serving Temperature Quick Reference ===\n');

Object.entries(SERVING_TEMP_REFERENCE).forEach(([product, temps]) => {
  console.log(`${product.toUpperCase()}:`);
  console.log(`  Draw: ${temps.draw}°C | Serve: ${temps.serve}°C | Store: ${temps.store}°C`);
  console.log(`  ${temps.description}`);
  console.log('');
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n=== P2 SCIENCE FEATURES SUMMARY ===');
console.log('✅ Fruit acidity & Brix calculations');
console.log('✅ Citric acid neutralization guidance');
console.log('✅ PAC adjustment for acidic fruits');
console.log('✅ Overrun prediction (batch & continuous)');
console.log('✅ Serving temperature recommendations');
console.log('✅ Product-specific temperature guidance');
console.log('===================================\n');
