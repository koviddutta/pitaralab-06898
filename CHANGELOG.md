# Changelog

All notable changes to the MeethaPitara Calculator project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-01-16 - AI Integration Phase

### 🚀 Major Features Added

#### AI-Powered Recipe Development
- **AI Suggest Ingredient**: Context-aware ingredient recommendations with detailed rationale
- **AI Recipe Optimization**: Automatic recipe improvement with before/after comparison
- **AI Warning Explanations**: Detailed explanations and fixes for formulation issues
- **AI Usage Tracking**: Real-time counter showing remaining AI requests (10/hour)

#### Edge Functions (Serverless AI)
- `suggest-ingredient`: Intelligent ingredient suggestions based on recipe context
- `explain-warning`: Detailed warning explanations with actionable fixes
- `thermo-metrics`: Advanced thermal property calculations
- `paste-formulator`: Enhanced with better error handling and retry logic

#### User Experience Improvements
- **Interactive Onboarding**: 3-step welcome tour (Add, Analyze, Save)
- **Expanded Glossary**: Added tooltips for Protein, Lactose, Total Sugars, SE
- **Mobile Polish**: Safe-area padding, improved chart scaling, backdrop blur
- **AI Usage Counter UI**: Compact badge and full card display modes

### 🛠️ Technical Improvements

#### Infrastructure
- **Rate Limiting**: Database-backed usage tracking with RLS policies
- **Retry Logic**: Exponential backoff for AI requests (max 3 attempts)
- **Error Handling**: Comprehensive error messages for all failure modes
- **Audit Logging**: All AI requests logged in `ai_usage_log` table

#### Testing
- **Vitest Test Suites**: Added tests for all edge functions
  - `tests/suggest-ingredient.spec.ts`
  - `tests/explain-warning.spec.ts`
  - `tests/thermo-metrics.spec.ts`

#### Code Quality
- **fetchWithRetry Utility**: Robust request handling with exponential backoff
- **useAIUsageLimit Hook**: Reusable hook for AI usage tracking
- **Type Safety**: Comprehensive TypeScript types for AI responses

### 📝 Documentation Updates
- Updated `README.md` with AI features and comprehensive documentation links
- Updated `AI_ENGINE_GUIDE.md` with new AI features and usage instructions
- Updated `IMPLEMENTATION_STATUS.md` with AI integration phase details
- Updated `TROUBLESHOOTING.md` with AI-specific troubleshooting
- Created `AI_FEATURES.md` with comprehensive AI documentation
- Created `CHANGELOG.md` to track project changes

### 🔧 Database Changes
- Created `ai_usage_log` table for usage tracking
- Added RLS policies for user-scoped AI logs
- Configured auto-incrementing usage tracking

### 🎨 UI Components Added
- `AIUsageCounter.tsx` - Real-time usage counter display
- `WarningExplanationDialog.tsx` - Warning explanation modal
- `Progress.tsx` - Progress bar component for usage visualization

### 📦 Files Created/Modified

**New Files:**
- `src/lib/fetchWithRetry.ts`
- `src/hooks/useAIUsageLimit.ts`
- `src/components/AIUsageCounter.tsx`
- `src/components/WarningExplanationDialog.tsx`
- `supabase/functions/suggest-ingredient/index.ts`
- `supabase/functions/explain-warning/index.ts`
- `supabase/functions/thermo-metrics/index.ts`
- `tests/suggest-ingredient.spec.ts`
- `tests/explain-warning.spec.ts`
- `tests/thermo-metrics.spec.ts`
- `AI_FEATURES.md`
- `CHANGELOG.md`

**Modified Files:**
- `src/components/RecipeCalculatorV2.tsx` - AI button integration
- `src/components/EnhancedWarningsPanel.tsx` - Warning explanation button
- `src/components/WelcomeTour.tsx` - 3-step onboarding
- `src/components/GlossaryTooltip.tsx` - Expanded terms
- `src/components/MetricsDisplayV2.tsx` - Glossary integration
- `src/components/MobileActionBar.tsx` - Mobile polish
- `src/styles/production.css` - Safe-area styles
- `src/components/ScienceMetricsPanel.tsx` - Chart responsiveness
- `supabase/config.toml` - Edge function registration
- `README.md` - Documentation updates
- `AI_ENGINE_GUIDE.md` - Feature documentation
- `IMPLEMENTATION_STATUS.md` - Status updates
- `TROUBLESHOOTING.md` - AI troubleshooting

---

## [1.5.0] - 2025-01-10 - Security & Polish Phase

### 🔒 Security Hardening
- Implemented comprehensive Row Level Security (RLS) policies
- Added input validation in edge functions
- Secured ingredient cost data with audit logging
- Documented security architecture and best practices

### 🎨 UX Improvements
- Fixed tab scrolling issues on mobile
- Resolved Paste Studio tab overlap
- Improved color contrast for accessibility
- Standardized tab behavior across components

### 📚 Documentation
- Created comprehensive security documentation
- Added troubleshooting guides
- Documented security architecture
- Created contribution guidelines

---

## [1.4.0] - 2024-12-20 - Machine Learning & Calibration

### 🧪 Scientific Features
- **Batch Logger**: Track production batches with lab measurements
- **Machine Guidance**: Optimal settings calculator for batch/continuous machines
- **Hydration Assistant**: Auto-detect stabilizers with hydration instructions
- **QA Checklist**: Quality assurance workflows

### 🔬 Enhanced Calculations
- Gelato Science v2.1 implementation
- Protein and lactose calculations
- Sucrose equivalents (SE)
- Freezing point depression (FPDT)
- POD (normalized sweetness index)

### 📊 Testing & Validation
- Vitest sanity tests for core calculations
- Acceptance tests from science guide
- Sugar coefficient validation
- Fruit sugar split calculations

---

## [1.3.0] - 2024-12-01 - Ingredient Library Expansion

### 🍓 Expanded Ingredients
- Added 10+ fruits with G/F/S sugar splits
- Sugar toolbox: maltodextrin, inulin, polydextrose, sorbitol
- Stabilizers: LBG, guar gum, carrageenan
- All ingredients with SP/PAC coefficients

### 📈 Metrics Enhancements
- Enhanced metrics display with color coding
- Target ranges for different product types
- Visual indicators for optimal parameters

---

## [1.2.0] - 2024-11-15 - AI Paste Studio

### 🤖 AI Integration (Phase 1)
- Paste Formulator using Google Gemini 2.5 Flash
- Scientific paste recipes with citations
- Industry benchmark validation
- Preservation method recommendations

### 🔧 Error Handling
- 45-second timeout per API call
- Retry logic with exponential backoff
- Rate limiting detection
- Enhanced JSON parsing

---

## [1.1.0] - 2024-11-01 - Core Calculator

### ⚡ Core Features
- Scientific recipe calculator
- SP/PAC calculations
- Total solids, fat, MSNF tracking
- Recipe templates (Vanilla, Mango, Chocolate)

### 🎯 Product-Specific
- Ice Cream mode
- Gelato mode (White, Finished, Fruit)
- Sorbet mode
- Product-specific targets

---

## [1.0.0] - 2024-10-15 - Initial Release

### 🎉 MVP Launch
- Basic recipe calculator
- Ingredient library (13 base ingredients)
- Real-time calculations
- Recipe save/load
- CSV import/export
- User authentication
- Responsive design

### 🏗️ Architecture
- React 18 + TypeScript
- Vite build system
- Lovable Cloud (Supabase) backend
- shadcn/ui component library
- Tailwind CSS styling

---

## Version Numbering

- **Major (X.0.0)**: Breaking changes, major feature additions
- **Minor (0.X.0)**: New features, non-breaking changes
- **Patch (0.0.X)**: Bug fixes, documentation updates

---

## Upgrade Notes

### From 1.x to 2.0

**Breaking Changes:**
- None - Fully backward compatible

**New Features:**
- AI Suggest Ingredient
- AI Recipe Optimization
- AI Warning Explanations
- AI Usage Tracking

**Required Actions:**
1. Users must be authenticated to use AI features
2. AI requests are rate limited to 10/hour
3. Review updated documentation for AI features

**Database Changes:**
- New table: `ai_usage_log`
- New RLS policies for AI usage tracking
- No migration required for existing users

---

## Future Roadmap

### Phase 3: Advanced AI (Q2 2025)
- [ ] AI recipe comparison
- [ ] AI flavor pairing engine
- [ ] AI cost optimization
- [ ] AI allergen substitution
- [ ] AI nutritional label generation

### Phase 4: Collaboration (Q3 2025)
- [ ] Recipe sharing
- [ ] Team workspaces
- [ ] Version control
- [ ] Comment system
- [ ] Real-time collaboration

### Phase 5: Production (Q4 2025)
- [ ] Batch scaling calculator
- [ ] Production scheduling
- [ ] Inventory management
- [ ] Cost tracking
- [ ] Multi-location support

### Continuous Improvements
- [ ] Enhanced accessibility (WCAG 2.1 AA)
- [ ] Performance optimizations
- [ ] Offline mode enhancements
- [ ] Multi-language support
- [ ] Mobile app (React Native)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:
- Reporting bugs
- Suggesting features
- Submitting pull requests
- Code style and standards

---

## License

See [LICENSE](./LICENSE) for details.

---

**Last Updated:** January 16, 2025  
**Current Version:** 2.0.0  
**Status:** Production-Ready 🟢
