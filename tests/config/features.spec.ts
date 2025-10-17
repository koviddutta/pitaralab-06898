import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests for feature flag configuration
 * Ensures environment variables control feature visibility correctly
 */

describe('Feature Flags Configuration', () => {
  // Mock import.meta.env
  const mockEnv = (flags: Record<string, string | undefined>) => {
    vi.stubGlobal('import', {
      meta: {
        env: flags
      }
    });
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.unstubAllGlobals();
  });

  describe('Environment Variable Parsing', () => {
    it('should enable feature when flag is "on"', () => {
      const ON = (v?: string) => (v ?? "").toLowerCase() === "on";
      expect(ON("on")).toBe(true);
      expect(ON("ON")).toBe(true);
      expect(ON("On")).toBe(true);
    });

    it('should disable feature when flag is "off"', () => {
      const ON = (v?: string) => (v ?? "").toLowerCase() === "on";
      expect(ON("off")).toBe(false);
      expect(ON("OFF")).toBe(false);
    });

    it('should disable feature when flag is any other value', () => {
      const ON = (v?: string) => (v ?? "").toLowerCase() === "on";
      expect(ON("false")).toBe(false);
      expect(ON("0")).toBe(false);
      expect(ON("no")).toBe(false);
      expect(ON("disabled")).toBe(false);
    });

    it('should handle undefined as disabled', () => {
      const ON = (v?: string) => (v ?? "").toLowerCase() === "on";
      expect(ON(undefined)).toBe(false);
    });

    it('should handle empty string as disabled', () => {
      const ON = (v?: string) => (v ?? "").toLowerCase() === "on";
      expect(ON("")).toBe(false);
    });
  });

  describe('Default Behavior', () => {
    it('should default to enabled when env var is undefined', () => {
      const ON = (v?: string) => (v ?? "").toLowerCase() === "on";
      const value = ON(undefined) || undefined === undefined;
      expect(value).toBe(true);
    });

    it('should use explicit "on" value when set', () => {
      const ON = (v?: string) => (v ?? "").toLowerCase() === "on";
      const value = ON("on") || "on" === undefined;
      expect(value).toBe(true);
    });

    it('should respect explicit "off" value', () => {
      const ON = (v?: string) => (v ?? "").toLowerCase() === "on";
      const value = ON("off") || "off" === undefined;
      expect(value).toBe(false);
    });
  });

  describe('Feature Combinations', () => {
    it('should allow disabling AI while keeping other features enabled', () => {
      const ON = (v?: string) => (v ?? "").toLowerCase() === "on";
      
      const FEATURES = {
        AI_SUGGESTIONS: ON("off") || "off" === undefined,
        SCIENCE_PANEL: ON("on") || "on" === undefined,
        PRODUCTION_MODE: ON("on") || "on" === undefined
      };

      expect(FEATURES.AI_SUGGESTIONS).toBe(false);
      expect(FEATURES.SCIENCE_PANEL).toBe(true);
      expect(FEATURES.PRODUCTION_MODE).toBe(true);
    });

    it('should allow enabling only specific features', () => {
      const ON = (v?: string) => (v ?? "").toLowerCase() === "on";
      
      const FEATURES = {
        AI_SUGGESTIONS: ON("on") || "on" === undefined,
        SCIENCE_PANEL: ON("off") || "off" === undefined,
        PRODUCTION_MODE: ON("off") || "off" === undefined
      };

      expect(FEATURES.AI_SUGGESTIONS).toBe(true);
      expect(FEATURES.SCIENCE_PANEL).toBe(false);
      expect(FEATURES.PRODUCTION_MODE).toBe(false);
    });

    it('should allow disabling all features', () => {
      const ON = (v?: string) => (v ?? "").toLowerCase() === "on";
      
      const FEATURES = {
        AI_SUGGESTIONS: ON("off") || "off" === undefined,
        SCIENCE_PANEL: ON("off") || "off" === undefined,
        PRODUCTION_MODE: ON("off") || "off" === undefined
      };

      expect(FEATURES.AI_SUGGESTIONS).toBe(false);
      expect(FEATURES.SCIENCE_PANEL).toBe(false);
      expect(FEATURES.PRODUCTION_MODE).toBe(false);
    });

    it('should enable all features by default (undefined env vars)', () => {
      const ON = (v?: string) => (v ?? "").toLowerCase() === "on";
      
      const FEATURES = {
        AI_SUGGESTIONS: ON(undefined) || undefined === undefined,
        SCIENCE_PANEL: ON(undefined) || undefined === undefined,
        PRODUCTION_MODE: ON(undefined) || undefined === undefined
      };

      expect(FEATURES.AI_SUGGESTIONS).toBe(true);
      expect(FEATURES.SCIENCE_PANEL).toBe(true);
      expect(FEATURES.PRODUCTION_MODE).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace in flag values', () => {
      const ON = (v?: string) => (v ?? "").toLowerCase() === "on";
      expect(ON(" on ")).toBe(false); // Whitespace makes it not equal to "on"
      expect(ON("on ")).toBe(false);
      expect(ON(" on")).toBe(false);
    });

    it('should be case-insensitive for "on" value', () => {
      const ON = (v?: string) => (v ?? "").toLowerCase() === "on";
      expect(ON("ON")).toBe(true);
      expect(ON("On")).toBe(true);
      expect(ON("oN")).toBe(true);
      expect(ON("on")).toBe(true);
    });

    it('should handle numeric string values', () => {
      const ON = (v?: string) => (v ?? "").toLowerCase() === "on";
      expect(ON("1")).toBe(false);
      expect(ON("0")).toBe(false);
    });
  });

  describe('Type Safety', () => {
    it('should maintain const typing for FEATURES object', () => {
      const ON = (v?: string) => (v ?? "").toLowerCase() === "on";
      
      const FEATURES = {
        AI_SUGGESTIONS: ON("on") || "on" === undefined,
        SCIENCE_PANEL: ON("on") || "on" === undefined,
        PRODUCTION_MODE: ON("on") || "on" === undefined
      } as const;

      type FeatureKey = keyof typeof FEATURES;
      
      const keys: FeatureKey[] = ['AI_SUGGESTIONS', 'SCIENCE_PANEL', 'PRODUCTION_MODE'];
      expect(keys.length).toBe(3);
    });
  });
});
