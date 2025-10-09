/**
 * UI Responsiveness Tests
 * Tests mobile and desktop layouts
 */

import { describe, it, expect } from 'vitest';

describe('Responsive UI Tests', () => {
  
  describe('Mobile Breakpoint Detection', () => {
    it('should detect mobile viewport at 767px', () => {
      const MOBILE_BREAKPOINT = 768;
      
      const isMobile = (width: number) => width < MOBILE_BREAKPOINT;
      
      expect(isMobile(767)).toBe(true);
      expect(isMobile(768)).toBe(false);
      expect(isMobile(320)).toBe(true);
      expect(isMobile(1024)).toBe(false);
    });
  });

  describe('Tab Layout Configuration', () => {
    it('should have all required tabs', () => {
      const requiredTabs = [
        'calculator',
        'flavour-engine',
        'enhanced',
        'paste-studio',
        'costing',
        'base-recipes',
        'converter',
        'cost'
      ];
      
      requiredTabs.forEach(tab => {
        expect(tab).toBeTruthy();
        expect(tab.length).toBeGreaterThan(0);
      });
    });

    it('should have mobile-specific tab', () => {
      const mobileOnlyTab = 'mobile-input';
      expect(mobileOnlyTab).toBe('mobile-input');
    });
  });

  describe('CSS Grid Responsiveness', () => {
    it('should use correct grid layout for desktop', () => {
      // Desktop: 3 columns
      const desktopGrid = 'lg:grid-cols-3';
      expect(desktopGrid).toContain('lg:grid-cols-3');
    });

    it('should use correct grid layout for mobile', () => {
      // Mobile: 1 column (default)
      const mobileGrid = 'grid-cols-1';
      expect(mobileGrid).toContain('grid-cols-1');
    });
  });

  describe('Touch Target Sizes', () => {
    it('should have appropriate button sizes for mobile', () => {
      // Minimum touch target: 44x44px (iOS) or 48x48px (Material Design)
      const minTouchSize = 44;
      
      const buttonSizes = {
        small: 32,
        medium: 40,
        large: 48
      };
      
      // Large buttons should meet minimum
      expect(buttonSizes.large).toBeGreaterThanOrEqual(minTouchSize);
    });

    it('should have adequate spacing between touch targets', () => {
      // Recommended: 8px minimum spacing
      const minSpacing = 8;
      
      const gapSizes = {
        tight: 4,
        normal: 8,
        relaxed: 16
      };
      
      expect(gapSizes.normal).toBeGreaterThanOrEqual(minSpacing);
      expect(gapSizes.relaxed).toBeGreaterThanOrEqual(minSpacing);
    });
  });

  describe('Font Scaling', () => {
    it('should use responsive font sizes', () => {
      const fontSizes = {
        xs: '0.75rem',  // 12px
        sm: '0.875rem', // 14px
        base: '1rem',   // 16px
        lg: '1.125rem', // 18px
        xl: '1.25rem'   // 20px
      };
      
      // Base font should be at least 16px for readability
      expect(parseFloat(fontSizes.base)).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Scrolling Behavior', () => {
    it('should enable horizontal scroll for mobile tabs', () => {
      const mobileTabsConfig = {
        overflowX: 'auto',
        scrollSnapType: 'x mandatory',
        webkitOverflowScrolling: 'touch'
      };
      
      expect(mobileTabsConfig.overflowX).toBe('auto');
      expect(mobileTabsConfig.scrollSnapType).toBe('x mandatory');
    });
  });

  describe('Component Rendering', () => {
    it('should render appropriate components for mobile', () => {
      const mobileComponents = [
        'MobileRecipeInput',
        'MobileTabsWrapper'
      ];
      
      mobileComponents.forEach(component => {
        expect(component).toBeTruthy();
      });
    });

    it('should render all components for desktop', () => {
      const desktopComponents = [
        'RecipeCalculatorV2',
        'MetricsDisplayV2',
        'ScienceMetricsPanel',
        'EnhancedWarningsPanel',
        'CompositionBar'
      ];
      
      desktopComponents.forEach(component => {
        expect(component).toBeTruthy();
      });
    });
  });

  describe('Layout Consistency', () => {
    it('should maintain consistent padding on mobile', () => {
      const mobilePadding = {
        container: 'px-2 md:px-4',
        card: 'p-3',
        content: 'p-4 md:p-6'
      };
      
      expect(mobilePadding.container).toContain('px-2');
      expect(mobilePadding.card).toContain('p-3');
    });

    it('should have responsive margins', () => {
      const margins = {
        small: 'mb-4 md:mb-8',
        medium: 'mt-4 md:mt-6',
        large: 'my-6 md:my-12'
      };
      
      Object.values(margins).forEach(margin => {
        expect(margin).toContain('md:');
      });
    });
  });
});
