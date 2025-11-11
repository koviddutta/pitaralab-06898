/**
 * Golden Recipe Fixtures - Science-validated test data
 * These recipes represent known-good formulations for regression testing
 */

export const GOLDEN_FIOR_DI_LATTE = {
  name: "Fior di Latte Gelato (Golden)",
  mode: "gelato" as const,
  productType: "gelato",
  ingredients: [
    { ingredientId: "milk-whole", grams: 700 },
    { ingredientId: "cream-35", grams: 150 },
    { ingredientId: "sugar-white", grams: 100 },
    { ingredientId: "smp", grams: 30 },
    { ingredientId: "dextrose", grams: 20 },
  ],
  expectedMetrics: {
    totalSolids: { min: 35, max: 40 },
    fat: { min: 6, max: 8 },
    sugars: { min: 18, max: 22 },
    msnf: { min: 10, max: 12 },
    fpdt: { min: -2.8, max: -2.2 },
    pod: { min: 200, max: 250 },
  }
};

export const GOLDEN_CHOCOLATE_GELATO = {
  name: "Chocolate Gelato (Golden)",
  mode: "gelato" as const,
  productType: "gelato",
  ingredients: [
    { ingredientId: "milk-whole", grams: 650 },
    { ingredientId: "cream-35", grams: 100 },
    { ingredientId: "sugar-white", grams: 100 },
    { ingredientId: "cocoa-powder", grams: 30 },
    { ingredientId: "smp", grams: 40 },
    { ingredientId: "dextrose", grams: 30 },
    { ingredientId: "dark-chocolate", grams: 50 },
  ],
  expectedMetrics: {
    totalSolids: { min: 38, max: 43 },
    fat: { min: 7, max: 9 },
    sugars: { min: 19, max: 23 },
    msnf: { min: 10, max: 12 },
    fpdt: { min: -2.8, max: -2.2 },
    pod: { min: 220, max: 270 },
  }
};

export const GOLDEN_STRAWBERRY_GELATO = {
  name: "Strawberry Gelato (Golden)",
  mode: "gelato" as const,
  productType: "gelato",
  ingredients: [
    { ingredientId: "milk-whole", grams: 550 },
    { ingredientId: "cream-35", grams: 100 },
    { ingredientId: "strawberry-puree", grams: 200 },
    { ingredientId: "sugar-white", grams: 100 },
    { ingredientId: "smp", grams: 30 },
    { ingredientId: "dextrose", grams: 20 },
  ],
  expectedMetrics: {
    totalSolids: { min: 36, max: 41 },
    fat: { min: 5, max: 7 },
    sugars: { min: 20, max: 24 },
    msnf: { min: 9, max: 11 },
    fpdt: { min: -2.8, max: -2.2 },
    pod: { min: 210, max: 260 },
  }
};

export const GOLDEN_KULFI = {
  name: "Traditional Kulfi (Golden)",
  mode: "kulfi" as const,
  productType: "kulfi",
  ingredients: [
    { ingredientId: "milk-whole", grams: 600 },
    { ingredientId: "cream-35", grams: 200 },
    { ingredientId: "sugar-white", grams: 120 },
    { ingredientId: "smp", grams: 50 },
    { ingredientId: "cardamom", grams: 5 },
    { ingredientId: "pistachio-paste", grams: 25 },
  ],
  expectedMetrics: {
    totalSolids: { min: 38, max: 45 },
    fat: { min: 9, max: 12 },
    sugars: { min: 18, max: 23 },
    msnf: { min: 11, max: 14 },
    fpdt: { min: -2.5, max: -2.0 },
    pod: { min: 220, max: 280 },
  }
};

export const GOLDEN_LEMON_SORBET = {
  name: "Lemon Sorbet (Golden)",
  mode: "sorbet" as const,
  productType: "sorbet",
  ingredients: [
    { ingredientId: "water", grams: 600 },
    { ingredientId: "lemon-juice", grams: 200 },
    { ingredientId: "sugar-white", grams: 150 },
    { ingredientId: "dextrose", grams: 30 },
    { ingredientId: "glucose-syrup-de60", grams: 20 },
  ],
  expectedMetrics: {
    totalSolids: { min: 28, max: 33 },
    fat: { min: 0, max: 0.5 },
    sugars: { min: 24, max: 28 },
    msnf: { min: 0, max: 0.5 },
    fpdt: { min: -3.5, max: -2.8 },
    pod: { min: 250, max: 300 },
  }
};

export const ALL_GOLDEN_RECIPES = [
  GOLDEN_FIOR_DI_LATTE,
  GOLDEN_CHOCOLATE_GELATO,
  GOLDEN_STRAWBERRY_GELATO,
  GOLDEN_KULFI,
  GOLDEN_LEMON_SORBET,
];
