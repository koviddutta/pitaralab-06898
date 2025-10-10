/**
 * Feature Flags Configuration
 * Control visibility of experimental or optional features
 */
export const FEATURES = {
  AI_SUGGESTIONS: true,
  SCIENCE_PANEL: true,
  PRODUCTION_MODE: true
} as const;

export type FeatureKey = keyof typeof FEATURES;
