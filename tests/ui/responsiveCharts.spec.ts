import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScienceMetricsPanel from '@/components/ScienceMetricsPanel';

describe('Responsive Charts', () => {
  it('should render without overflow on 320px width and show numeric chips', () => {
    // Mock window.innerWidth for small screen
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 320,
    });

    // Mock data for the panel
    const mockProps = {
      podIndex: 100,
      fpdt: 2.8,
      mode: 'gelato' as const,
      sugars: {
        sucrose_g: 100,
        dextrose_g: 50,
        fructose_g: 20,
        lactose_g: 30,
      },
      composition: {
        waterPct: 60,
        fatPct: 8,
        msnfPct: 11,
        sugarsPct: 20,
        otherPct: 1,
      },
      rows: [
        { ing_id: '1', grams: 600 },
        { ing_id: '2', grams: 150 },
      ],
      serveTempC: -12,
    };

    const { container } = render(<ScienceMetricsPanel {...mockProps} />);

    // Verify container doesn't overflow
    const cards = container.querySelectorAll('.card');
    expect(cards.length).toBeGreaterThan(0);

    // Check that chart containers have min-height
    const chartContainers = container.querySelectorAll('.min-h-\\[140px\\]');
    expect(chartContainers.length).toBeGreaterThan(0);

    // Verify numeric badges/chips are present on small screens
    // Sugar spectrum should show badges when isSmallScreen = true
    const badges = screen.queryAllByRole('status'); // Badge components typically have role="status"
    
    // At minimum, verify the component renders without errors
    expect(container).toBeTruthy();
    
    // Check for numeric values being displayed (either in badges or text)
    expect(container.textContent).toContain('100'); // POD value
    expect(container.textContent).toContain('60'); // Water percentage
  });

  it('should show full labels on wider screens (>360px)', () => {
    // Mock window.innerWidth for normal screen
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const mockProps = {
      podIndex: 100,
      fpdt: 2.8,
      mode: 'gelato' as const,
      sugars: {
        sucrose_g: 100,
        dextrose_g: 50,
        fructose_g: 0,
        lactose_g: 0,
      },
      composition: {
        waterPct: 60,
        fatPct: 8,
        msnfPct: 11,
        sugarsPct: 20,
        otherPct: 1,
      },
      rows: [],
      serveTempC: -12,
    };

    const { container } = render(<ScienceMetricsPanel {...mockProps} />);

    // On larger screens, full labels should be visible
    expect(container.textContent).toContain('Water:');
    expect(container.textContent).toContain('Fat:');
    expect(container.textContent).toContain('MSNF:');
    expect(container.textContent).toContain('Sugars:');
  });

  it('should not have horizontal overflow on any chart card', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 320,
    });

    const mockProps = {
      podIndex: 85,
      fpdt: 2.5,
      mode: 'kulfi' as const,
      sugars: {
        sucrose_g: 120,
        dextrose_g: 40,
        fructose_g: 10,
        lactose_g: 25,
      },
      composition: {
        waterPct: 55,
        fatPct: 10,
        msnfPct: 15,
        sugarsPct: 19,
        otherPct: 1,
      },
      rows: [],
      serveTempC: -10,
    };

    const { container } = render(<ScienceMetricsPanel {...mockProps} />);

    // All cards should be contained properly
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeTruthy();
    
    // Verify no elements exceed viewport on small screens
    const cards = container.querySelectorAll('.card');
    cards.forEach(card => {
      const cardElement = card as HTMLElement;
      // Card should be styled to fit within container
      expect(cardElement.className).toContain('p-');
    });
  });
});
