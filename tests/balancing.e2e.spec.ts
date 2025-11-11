import { test, expect } from '@playwright/test';

test.describe('Balance Engine E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await page.waitForSelector('[data-testid="recipe-calculator"]', { timeout: 10000 });
  });

  test('should show database health indicator', async ({ page }) => {
    // Check if database health indicator is visible
    const healthIndicator = page.locator('[data-testid="db-health-indicator"]');
    await expect(healthIndicator).toBeVisible();
  });

  test('should balance a simple gelato recipe', async ({ page }) => {
    // Add ingredients
    await page.click('[data-testid="add-ingredient-btn"]');
    await page.fill('[data-testid="ingredient-search"]', 'milk');
    await page.click('text=Whole Milk');
    await page.fill('[data-testid="ingredient-amount"]', '700');
    
    await page.click('[data-testid="add-ingredient-btn"]');
    await page.fill('[data-testid="ingredient-search"]', 'cream');
    await page.click('text=Heavy Cream');
    await page.fill('[data-testid="ingredient-amount"]', '150');
    
    await page.click('[data-testid="add-ingredient-btn"]');
    await page.fill('[data-testid="ingredient-search"]', 'sugar');
    await page.click('text=White Sugar');
    await page.fill('[data-testid="ingredient-amount"]', '100');
    
    // Trigger balance
    await page.click('[data-testid="balance-recipe-btn"]');
    
    // Wait for balance to complete
    await page.waitForSelector('text=Balance successful', { timeout: 5000 });
    
    // Check metrics are displayed
    await expect(page.locator('[data-testid="metric-total-solids"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-fat"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-fpdt"]')).toBeVisible();
  });

  test('should show auto-fix suggestions for missing ingredients', async ({ page }) => {
    // Add only fruit (unbalanceable)
    await page.click('[data-testid="add-ingredient-btn"]');
    await page.fill('[data-testid="ingredient-search"]', 'strawberry');
    await page.click('text=Strawberry Puree');
    await page.fill('[data-testid="ingredient-amount"]', '300');
    
    // Trigger balance
    await page.click('[data-testid="balance-recipe-btn"]');
    
    // Should show auto-fix suggestions
    await expect(page.locator('text=Auto-fix applied')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Water')).toBeVisible();
  });

  test('should respect butter limits in Kulfi mode', async ({ page }) => {
    // Switch to Kulfi mode
    await page.click('[data-testid="mode-selector"]');
    await page.click('text=Kulfi');
    
    // Add butter
    await page.click('[data-testid="add-ingredient-btn"]');
    await page.fill('[data-testid="ingredient-search"]', 'butter');
    await page.click('text=Butter');
    await page.fill('[data-testid="ingredient-amount"]', '50');
    
    // Add other ingredients
    await page.click('[data-testid="add-ingredient-btn"]');
    await page.fill('[data-testid="ingredient-search"]', 'milk');
    await page.click('text=Whole Milk');
    await page.fill('[data-testid="ingredient-amount"]', '700');
    
    // Trigger balance
    await page.click('[data-testid="balance-recipe-btn"]');
    
    // Check that butter is capped at 40g
    const butterAmount = await page.locator('[data-testid="ingredient-butter-amount"]').inputValue();
    expect(parseFloat(butterAmount)).toBeLessThanOrEqual(40);
  });

  test('should block dairy in sorbet mode', async ({ page }) => {
    // Switch to Sorbet mode
    await page.click('[data-testid="mode-selector"]');
    await page.click('text=Sorbet');
    
    // Try to add cream
    await page.click('[data-testid="add-ingredient-btn"]');
    await page.fill('[data-testid="ingredient-search"]', 'cream');
    
    // Should show warning or block addition
    await expect(page.locator('text=dairy not allowed in sorbet')).toBeVisible();
  });

  test('should validate sugar spectrum ranges', async ({ page }) => {
    // Add ingredients with sugar
    await page.click('[data-testid="add-ingredient-btn"]');
    await page.fill('[data-testid="ingredient-search"]', 'milk');
    await page.click('text=Whole Milk');
    await page.fill('[data-testid="ingredient-amount"]', '700');
    
    await page.click('[data-testid="add-ingredient-btn"]');
    await page.fill('[data-testid="ingredient-search"]', 'sugar');
    await page.click('text=White Sugar');
    await page.fill('[data-testid="ingredient-amount"]', '150');
    
    // Balance
    await page.click('[data-testid="balance-recipe-btn"]');
    await page.waitForSelector('[data-testid="metrics-panel"]', { timeout: 5000 });
    
    // Check sugar spectrum warnings
    const sugarWarning = page.locator('[data-testid="sugar-spectrum-warning"]');
    if (await sugarWarning.isVisible()) {
      await expect(sugarWarning).toContainText(/disaccharide|monosaccharide|polysaccharide/);
    }
  });

  test('should apply sugar preset quick action', async ({ page }) => {
    // Add base ingredients
    await page.click('[data-testid="add-ingredient-btn"]');
    await page.fill('[data-testid="ingredient-search"]', 'milk');
    await page.click('text=Whole Milk');
    await page.fill('[data-testid="ingredient-amount"]', '700');
    
    // Apply sugar preset
    await page.click('[data-testid="sugar-preset-btn"]');
    
    // Should add optimal sugar blend (70/10/20)
    await expect(page.locator('text=Sugar preset applied')).toBeVisible();
    await expect(page.locator('text=Sucrose')).toBeVisible();
    await expect(page.locator('text=Dextrose')).toBeVisible();
  });

  test('should show balancing debug panel', async ({ page }) => {
    // Open debug panel
    await page.click('[data-testid="debug-panel-toggle"]');
    
    // Check debug panel is visible
    await expect(page.locator('[data-testid="balancing-debug-panel"]')).toBeVisible();
    
    // Should show balancing status
    await expect(page.locator('[data-testid="balance-status"]')).toBeVisible();
  });

  test('should scroll to metrics after successful balance', async ({ page }) => {
    // Add a complete recipe
    await page.click('[data-testid="add-ingredient-btn"]');
    await page.fill('[data-testid="ingredient-search"]', 'milk');
    await page.click('text=Whole Milk');
    await page.fill('[data-testid="ingredient-amount"]', '700');
    
    await page.click('[data-testid="add-ingredient-btn"]');
    await page.fill('[data-testid="ingredient-search"]', 'cream');
    await page.click('text=Heavy Cream');
    await page.fill('[data-testid="ingredient-amount"]', '150');
    
    await page.click('[data-testid="add-ingredient-btn"]');
    await page.fill('[data-testid="ingredient-search"]', 'sugar');
    await page.click('text=White Sugar');
    await page.fill('[data-testid="ingredient-amount"]', '100');
    
    // Trigger balance
    await page.click('[data-testid="balance-recipe-btn"]');
    
    // Wait for success
    await page.waitForSelector('text=Balance successful', { timeout: 5000 });
    
    // Check that metrics panel is in viewport (scrolled to)
    const metricsPanel = page.locator('[data-testid="metrics-panel"]');
    await expect(metricsPanel).toBeInViewport();
  });
});
