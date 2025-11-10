/**
 * PHASE 7: Science Conformance Acceptance Tests
 * Tests the implementation against the science specification
 */

import { test, expect } from '@playwright/test';

test.describe('Science Conformance - Acceptance Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('text=Recipe Calculator', { timeout: 10000 });
  });

  // ============================================================================
  // TEST 1: Ice-Cream Infeasible → Destructive Toast
  // ============================================================================
  
  test('1. Ice-Cream (infeasible): Should show destructive toast with clear suggestions', async ({ page }) => {
    // Set product type to ice cream
    await page.selectOption('select', { label: 'Ice Cream' });
    
    // Add only Whole Milk 500g + Sucrose 100g (missing Water, Cream, SMP)
    await page.click('button:has-text("Add Row")');
    await page.fill('input[placeholder="Search ingredients..."]', 'Milk');
    await page.click('text=Whole Milk');
    await page.fill('input[type="number"]', '500');
    
    await page.click('button:has-text("Add Row")');
    await page.fill('input[placeholder="Search ingredients..."]', 'Sucrose');
    await page.click('text=Sucrose');
    await page.fill('input[type="number"]', '100');
    
    // Try to balance
    await page.click('button:has-text("Balance Recipe")');
    
    // Should show destructive toast with feasibility error
    const toast = await page.waitForSelector('.toast', { timeout: 5000 });
    const toastText = await toast.textContent();
    
    expect(toastText).toContain('Cannot balance');
    expect(toastText).toMatch(/(Add Water|Add Heavy Cream|Add Butter|Add SMP)/i);
    
    // Recipe rows should NOT have changed (no mutation)
    const rows = await page.$$('tr');
    expect(rows.length).toBeLessThanOrEqual(3); // Original 2 + header
  });

  // ============================================================================
  // TEST 2: Ice-Cream Feasible → Success Toast + Metrics in Range
  // ============================================================================
  
  test('2. Ice-Cream (feasible): Should balance successfully with metrics in range', async ({ page }) => {
    // Set product type to ice cream
    await page.selectOption('select', { label: 'Ice Cream' });
    
    // Add feasible ingredients: Milk + Water + Cream + Sucrose
    const ingredients = [
      { name: 'Whole Milk', quantity: '500' },
      { name: 'Water', quantity: '200' },
      { name: 'Heavy Cream 35%', quantity: '150' },
      { name: 'Sucrose', quantity: '100' }
    ];
    
    for (const ing of ingredients) {
      await page.click('button:has-text("Add Row")');
      await page.fill('input[placeholder="Search ingredients..."]', ing.name);
      await page.click(`text=${ing.name}`);
      await page.fill('input[type="number"]', ing.quantity);
    }
    
    // Calculate first
    await page.click('button:has-text("Calculate")');
    await page.waitForTimeout(1000);
    
    // Balance
    await page.click('button:has-text("Balance Recipe")');
    
    // Should show success toast
    const toast = await page.waitForSelector('.toast', { timeout: 5000 });
    const toastText = await toast.textContent();
    
    expect(toastText).toMatch(/(Balanced|Success|Optimal)/i);
    
    // Check metrics are in range
    const metricsCard = await page.waitForSelector('text=Metrics');
    const metricsText = await metricsCard.textContent();
    
    // Fat: 10-16%, MSNF: 9-14%, Sugars: 14-20%, TS: 36-42%, FPDT: ~2.2-3.2°C
    expect(metricsText).toMatch(/Fat.*1[0-6]\.\d/);
    expect(metricsText).toMatch(/MSNF.*[9-1][0-4]\.\d/);
    expect(metricsText).toMatch(/Total Sugars.*1[4-9]\.\d/);
  });

  // ============================================================================
  // TEST 3: Gelato → Balanced with SP/AFP in Bands
  // ============================================================================
  
  test('3. Gelato: Should balance with SP/AFP within gelato bands', async ({ page }) => {
    // Set product type to gelato
    await page.selectOption('select', { label: 'Gelato' });
    
    // Add typical gelato ingredients
    const ingredients = [
      { name: 'Whole Milk', quantity: '650' },
      { name: 'Heavy Cream 35%', quantity: '150' },
      { name: 'Skim Milk Powder', quantity: '60' },
      { name: 'Sucrose', quantity: '120' },
      { name: 'Dextrose', quantity: '20' }
    ];
    
    for (const ing of ingredients) {
      await page.click('button:has-text("Add Row")');
      await page.fill('input[placeholder="Search ingredients..."]', ing.name);
      await page.click(`text=${ing.name}`);
      await page.fill('input[type="number"]', ing.quantity);
    }
    
    // Calculate
    await page.click('button:has-text("Calculate")');
    await page.waitForTimeout(1000);
    
    // Balance
    await page.click('button:has-text("Balance Recipe")');
    await page.waitForTimeout(2000);
    
    // Should show success
    const toast = await page.waitForSelector('.toast', { timeout: 5000 });
    const toastText = await toast.textContent();
    expect(toastText).toMatch(/(Balanced|Success)/i);
    
    // Check gelato ranges: Fat 6-10%, MSNF 9-12%, Sugars 18-22%, TS 37-46%
    const metricsText = await page.textContent('text=Metrics');
    expect(metricsText).toMatch(/Fat.*[6-9]\.\d/);
    expect(metricsText).toMatch(/MSNF.*[9-1][0-2]\.\d/);
  });

  // ============================================================================
  // TEST 4: Sorbet → Sugars 26-31%, No Dairy, Negative FPDT Allowed
  // ============================================================================
  
  test('4. Sorbet: Should balance with correct sugar range and no dairy added', async ({ page }) => {
    // Set product type to sorbet
    await page.selectOption('select', { label: 'Sorbet' });
    
    // Add sorbet ingredients (fruit-based, no dairy)
    const ingredients = [
      { name: 'Strawberry Puree', quantity: '400' },
      { name: 'Sucrose', quantity: '180' },
      { name: 'Dextrose', quantity: '60' },
      { name: 'Water', quantity: '360' }
    ];
    
    for (const ing of ingredients) {
      await page.click('button:has-text("Add Row")');
      await page.fill('input[placeholder="Search ingredients..."]', ing.name);
      await page.click(`text=${ing.name}`);
      await page.fill('input[type="number"]', ing.quantity);
    }
    
    // Calculate
    await page.click('button:has-text("Calculate")');
    await page.waitForTimeout(1000);
    
    // Balance
    await page.click('button:has-text("Balance Recipe")');
    await page.waitForTimeout(2000);
    
    const toast = await page.waitForSelector('.toast', { timeout: 5000 });
    const toastText = await toast.textContent();
    expect(toastText).toMatch(/(Balanced|Success)/i);
    
    // Check that no dairy was added
    const rowsText = await page.textContent('tbody');
    expect(rowsText).not.toMatch(/(Milk|Cream|SMP|MSNF)/i);
    
    // Check sorbet ranges: Sugars 26-31%
    const metricsText = await page.textContent('text=Metrics');
    expect(metricsText).toMatch(/Total Sugars.*2[6-9]\.\d/);
  });

  // ============================================================================
  // TEST 5: Mode Mapping Sanity → Warnings Reference Correct Mode
  // ============================================================================
  
  test('5. Mode Mapping: Warnings should reference the selected mode', async ({ page }) => {
    // Test with Ice Cream mode
    await page.selectOption('select', { label: 'Ice Cream' });
    
    // Add a recipe that violates ice cream constraints
    const ingredients = [
      { name: 'Whole Milk', quantity: '800' }, // Too much milk = low fat
      { name: 'Sucrose', quantity: '100' }
    ];
    
    for (const ing of ingredients) {
      await page.click('button:has-text("Add Row")');
      await page.fill('input[placeholder="Search ingredients..."]', ing.name);
      await page.click(`text=${ing.name}`);
      await page.fill('input[type="number"]', ing.quantity);
    }
    
    // Calculate
    await page.click('button:has-text("Calculate")');
    await page.waitForTimeout(1000);
    
    // Check warnings mention "ice cream" NOT "kulfi" or "gelato"
    const warningsCard = await page.waitForSelector('text=Warnings');
    const warningsText = await warningsCard.textContent();
    
    expect(warningsText).toMatch(/ice cream/i);
    expect(warningsText).not.toMatch(/kulfi/i);
    
    // Now switch to Gelato and verify warnings update
    await page.selectOption('select', { label: 'Gelato' });
    await page.click('button:has-text("Calculate")');
    await page.waitForTimeout(1000);
    
    const gelatoWarnings = await page.textContent('text=Warnings');
    expect(gelatoWarnings).toMatch(/gelato/i);
    expect(gelatoWarnings).not.toMatch(/ice cream/i);
  });

  // ============================================================================
  // BONUS: Test Context-Aware MSNF Constraints (Chocolate)
  // ============================================================================
  
  test('6. Context-Aware: Should apply chocolate-specific MSNF constraints', async ({ page }) => {
    await page.selectOption('select', { label: 'Gelato' });
    
    // Add chocolate gelato
    const ingredients = [
      { name: 'Whole Milk', quantity: '600' },
      { name: 'Heavy Cream 35%', quantity: '100' },
      { name: 'Cocoa Powder', quantity: '80' }, // Triggers chocolate context
      { name: 'Sucrose', quantity: '150' }
    ];
    
    for (const ing of ingredients) {
      await page.click('button:has-text("Add Row")');
      await page.fill('input[placeholder="Search ingredients..."]', ing.name);
      await page.click(`text=${ing.name}`);
      await page.fill('input[type="number"]', ing.quantity);
    }
    
    await page.click('button:has-text("Calculate")');
    await page.waitForTimeout(1000);
    
    // Should show chocolate-specific context in warnings if MSNF out of range
    const warningsText = await page.textContent('body');
    
    // If MSNF is outside 7-9%, should mention chocolate context
    if (warningsText.includes('MSNF')) {
      expect(warningsText).toMatch(/chocolate|cocoa/i);
    }
  });

  // ============================================================================
  // TEST: Sugar Spectrum Validation
  // ============================================================================
  
  test('7. Sugar Spectrum: Should validate disaccharide/monosaccharide ratios', async ({ page }) => {
    await page.selectOption('select', { label: 'Gelato' });
    
    // Create recipe with too much dextrose (monosaccharides > 25%)
    const ingredients = [
      { name: 'Whole Milk', quantity: '700' },
      { name: 'Dextrose', quantity: '150' }, // High monosaccharides
      { name: 'Sucrose', quantity: '50' }
    ];
    
    for (const ing of ingredients) {
      await page.click('button:has-text("Add Row")');
      await page.fill('input[placeholder="Search ingredients..."]', ing.name);
      await page.click(`text=${ing.name}`);
      await page.fill('input[type="number"]', ing.quantity);
    }
    
    await page.click('button:has-text("Calculate")');
    await page.waitForTimeout(1000);
    
    // Should show sugar spectrum warning
    const warningsText = await page.textContent('body');
    expect(warningsText).toMatch(/monosaccharides.*25%/i);
  });

});
