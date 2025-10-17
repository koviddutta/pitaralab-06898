# MeethaPitara Calculator

Professional gelato and ice cream formulation system with AI-powered optimization.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Access at `http://localhost:5173`

## 📚 Documentation

### Core Documentation
- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - Features, architecture, and technical highlights
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed setup and development guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and design patterns
- **[EVALUATION_REPORT.md](EVALUATION_REPORT.md)** - Comprehensive technical evaluation
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and release notes

### AI Features
- **[AI_FEATURES.md](AI_FEATURES.md)** - Complete AI features documentation
- **[AI_ENGINE_GUIDE.md](AI_ENGINE_GUIDE.md)** - AI Engine user guide

### Implementation & Security
- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** - Current implementation status
- **[SECURITY.md](SECURITY.md)** - Security policies and architecture
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions

## ✨ Key Features

- **Scientific Calculator**: Precision formulation with SP/PAC calculations
- **AI Paste Studio**: Generate scientific paste recipes with citations
- **Flavour Engine**: Multi-ingredient analysis and optimization
- **Reverse Engineering**: Generate recipes from target nutritional profiles
- **Interactive Onboarding**: 3-step welcome tour + contextual tooltips
- **Recipe Templates**: Quick start with Classic Vanilla, Mango Kulfi, Dark Chocolate
- **Glossary & Help**: Comprehensive /help/glossary with technical term definitions
- **Cost Calculator**: Batch costing with waste factors
- **15+ Specialized Tools**: Unit converters, machine selectors, QA checklists

## 🛠️ Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Lovable Cloud (Supabase backend)
- Google Gemini AI
- shadcn/ui + Tailwind CSS
- React Query

## 📦 Project Structure

```
src/
├── components/          # React components (15+ calculators)
├── lib/                 # Core logic (calc, optimize, ingredients)
├── services/            # External integrations (AI, database)
├── types/               # TypeScript definitions
└── pages/               # Main application pages
```

## 🔬 Core Calculations

- **Total Solids**: Sugars + Fat + MSNF + Other Solids
- **SP (Sweetness Power)**: Weighted sugar coefficients
- **PAC (Anti-freezing Capacity)**: Sugar-based freezing point depression
- **MSNF**: Protein + Lactose + Other milk solids

## 🤖 AI Integration

The app features comprehensive AI-powered capabilities powered by **Google Gemini** (no API key required):

### AI Features Overview
- **AI Ingredient Suggestions**: Get intelligent ingredient recommendations with rationale
- **AI Recipe Optimization**: Optimize recipes for texture, flavor, and composition
- **AI Warning Explanations**: Understand and fix formulation issues with detailed guidance
- **AI Paste Formulator**: Generate scientific paste recipes with citations
- **AI Insights Engine**: ML-driven recipe success predictions and flavor analysis
- **Rate Limiting**: Built-in usage tracking (10 requests/hour per user)

### AI Flavour Engine
Advanced machine learning-powered recipe development:
- **AI Insights**: ML-driven recipe success predictions and flavor analysis
- **Chemistry Analysis**: Real-time composition tracking and validation  
- **Sugar Blend Optimizer**: Optimize sugar types for perfect texture
- **Ingredient Analyzer**: Smart ingredient suggestions and substitutions
- **Flavor Pairings**: Discover complementary ingredient combinations
- **Temperature Calculator**: Optimize serving temperatures
- **Reverse Engineer**: Generate recipes from target specifications
- **Paste Studio**: Design and integrate flavor pastes
- **Product-Specific**: Optimized for Ice Cream, Gelato, and Sorbet
- **Works Offline**: Core features available even without backend

📖 See [AI_ENGINE_GUIDE.md](./AI_ENGINE_GUIDE.md) for complete usage guide

### Edge Functions (AI-Powered)
Built-in AI endpoints using **Google Gemini 2.5 Flash**:

#### 1. Suggest Ingredient (`/suggest-ingredient`)
- Intelligent ingredient recommendations based on recipe context
- Considers product type, existing ingredients, and target metrics
- Provides detailed rationale for each suggestion
- Rate limited to prevent abuse

#### 2. Paste Formulator (`/paste-formulator`)
- Scientific paste recipes with citations
- Industry benchmark validation
- Preservation method recommendations
- Cost optimization

#### 3. Explain Warning (`/explain-warning`)
- Detailed explanations for formulation warnings
- Actionable fixes for composition issues
- Context-aware recommendations

#### 4. Thermo Metrics (`/thermo-metrics`)
- Advanced thermal property calculations
- Freezing point depression analysis
- Science-backed formulation guidance

### AI Usage Tracking
- **Real-time Counter**: Shows remaining AI requests in UI
- **Rate Limiting**: 10 requests/hour per authenticated user
- **Usage Logs**: Stored in `ai_usage_log` table for audit trail
- **Graceful Degradation**: Clear error messages when limits reached

## 🎯 Production Ready

✅ Critical bugs fixed  
✅ Scientific accuracy verified  
✅ Error handling comprehensive  
✅ Performance optimized  
✅ Type safety enforced  
✅ Design system standardized (shadcn/ui)  
✅ Service layer tested (Vitest)  
✅ AI integration complete with rate limiting  
✅ Edge functions deployed and monitored  
✅ Security hardening implemented  
✅ Comprehensive documentation

**Status**: Production-ready (9/10 quality score)

## Lovable Project Info

**URL**: https://lovable.dev/projects/bb17a160-6168-458c-8e73-bd021475485e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/bb17a160-6168-458c-8e73-bd021475485e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/bb17a160-6168-458c-8e73-bd021475485e) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
Check 
