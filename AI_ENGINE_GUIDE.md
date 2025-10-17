# AI Engine User Guide

## Overview

The AI Engine tab provides advanced machine learning-powered recipe analysis and optimization for ice cream, gelato, and sorbet recipes. It works even when the backend is temporarily unavailable by using default ingredients.

## Features

### 1. **Recipe Development**
- Add and adjust ingredients with real-time calculations
- Product-specific parameters (Ice Cream, Gelato, Sorbet)
- Automatic metric calculations (Total Solids, Fat, MSNF, PAC, etc.)

### 2. **AI Insights** 🤖
- Recipe Success Score (ML prediction)
- Flavor Profile Analysis
- ML-powered recommendations
- Similar recipe suggestions

### 3. **AI Ingredient Suggestions** ⭐ NEW
- Click "AI Suggest Ingredient" for intelligent recommendations
- Context-aware suggestions based on your recipe
- Detailed rationale for each suggestion
- Considers product type and target metrics
- Rate limited (10 uses/hour)

### 4. **AI Recipe Optimization** ⭐ NEW
- Click "AI Optimize Recipe" to improve formulation
- Before/after comparison view
- Targeted improvements for texture and flavor
- Maintains recipe identity while enhancing balance

### 5. **AI Warning Explanations** ⭐ NEW
- Click "?" next to any warning for detailed explanation
- Understand why issues occur
- Get actionable fixes
- Science-backed recommendations

### 6. **Chemistry Analysis**
- Real-time composition tracking
- Target range validation
- Visual indicators for optimal parameters

### 7. **Sugar Blend Optimizer**
- Optimize sugar types for your product
- Balance sweetness with freezing point
- Product-specific recommendations

### 8. **Ingredient Analyzer**
- Search and add ingredients
- Ingredient similarity suggestions
- Category-based filtering

### 9. **AI Usage Tracking** ⭐ NEW
- Real-time counter shows remaining AI requests
- 10 requests per hour per user
- Automatic reset after 1 hour
- Clear notifications when limit reached

## How to Use

### Getting Started

1. **Navigate to the AI Engine Tab**
   - Click on "🤖 AI Engine" in the main navigation
   - The interface loads with a default recipe

2. **Select Product Type**
   - Choose from: Ice Cream, Gelato (White), Gelato (Finished), Fruit Gelato, or Sorbet
   - Targets automatically adjust based on product type

3. **Build Your Recipe**
   - Enter a recipe name
   - Add ingredients using the input fields
   - Adjust quantities in grams
   - Remove ingredients by clicking the X button

### Working with the AI

**AI Insights Panel:**
- Automatically analyzes your recipe as you make changes
- Shows a success score (0-100%)
- Provides flavor profile breakdown
- Offers optimization suggestions

**AI Suggest Ingredient:**
1. Click the "AI Suggest Ingredient" button
2. AI analyzes your current recipe
3. Receives 3-5 contextualized suggestions
4. Each suggestion includes rationale
5. Click to add ingredient to recipe

**AI Optimize Recipe:**
1. Click "AI Optimize Recipe" button
2. AI analyzes composition and balance
3. Shows before/after comparison
4. Highlights specific improvements
5. Apply or dismiss suggestions

**AI Explain Warning:**
1. Look for warnings in the warnings panel
2. Click the "?" button next to any warning
3. Read detailed explanation and fixes
4. Apply recommended solutions

**What the AI Analyzes:**
- Total composition balance
- Ingredient proportions
- Flavor compatibility
- Product-specific targets
- Freezing point considerations
- Texture and mouthfeel predictions
- Formulation defects and fixes

### Understanding the Metrics

**Basic Metrics:**
- **Total Solids (TS)**: Should be 36-42% for most products
- **Fat**: 6-18% depending on product type
- **MSNF**: Milk solids non-fat, typically 9-12%
- **Sugars**: 14-24% depending on product
- **PAC**: Anti-freezing power, affects texture

**Color-Coded Indicators:**
- 🟢 **Green**: Within optimal range
- 🟡 **Yellow**: Acceptable but could be improved
- 🔴 **Red**: Outside recommended range

### Saving and Sharing

**Save Recipe:**
1. Enter a recipe name
2. Click "Save Recipe" button
3. Recipe is saved to your account (requires authentication)

**Export Recipe:**
1. Click "Export" button
2. Downloads CSV file with full recipe details
3. Can be imported later or shared

**Import Recipe:**
1. Click "Import" button
2. Select a CSV file
3. Recipe loads with all ingredients

## Advanced Features

### Target & Validation Tab
- View all calculated parameters
- See target ranges for selected product
- Identify areas for improvement

### Flavor Pairings Tab
- Discover complementary ingredients
- Get pairing confidence scores
- Add recommended ingredients directly

### Temperature Tab
- Calculate draw temperature
- Optimize serving temperature
- Machine-specific recommendations

### Reverse Engineer Tab
- Start with desired characteristics
- AI generates recipe to match
- Useful for replicating products

### Paste Studio Tab
- Design flavor pastes
- Calculate paste compositions
- Integrate into recipes

## Working Offline

The AI Engine can work without backend connection:

**Available Features:**
- Recipe development with default ingredients
- AI predictions and insights
- All calculations and metrics
- Export functionality
- Local draft saving

**Limited Features (Requires Backend):**
- Saving recipes to account
- Loading saved recipes
- Accessing custom ingredient database
- Sharing recipes

**What You'll See:**
If the backend is unavailable, you'll see a yellow warning banner:
> "⚠️ Using default ingredients - database connection unavailable. You can still use the AI Engine with the current recipe."

This is normal and doesn't affect core functionality.

## Tips for Best Results

### Recipe Optimization

1. **Start with a Template**
   - Use the default recipe as a base
   - Adjust gradually
   - Monitor metrics continuously

2. **Balance Key Parameters**
   - Total Solids: Controls texture
   - Fat: Affects mouthfeel and richness
   - Sugars: Impacts sweetness and freezing point
   - MSNF: Contributes to body

3. **Use AI Suggestions**
   - Pay attention to recommendations
   - AI knows product-specific best practices
   - Success score above 80% is excellent

4. **Test Incrementally**
   - Make small changes
   - Observe metric changes
   - Save successful versions

### Product-Specific Tips

**Ice Cream:**
- Higher fat content (14-18%)
- Total solids 36-40%
- More forgiving on sugar balance

**Gelato:**
- Lower fat (6-10%)
- Higher MSNF (10-12%)
- More precise sugar balance needed

**Sorbet:**
- No dairy (fat = 0%)
- Higher sugar content (20-24%)
- Focus on freezing point depression

## Troubleshooting

### AI Insights Not Showing

**Problem:** AI Insights panel shows "Add ingredients to get AI predictions"

**Solution:**
1. Ensure you have at least one ingredient with amount > 0
2. Check that ingredient amounts are reasonable (not all zeros)
3. Try modifying an ingredient amount to trigger recalculation

### Metrics Showing Red

**Problem:** Multiple metrics are outside target range

**Solution:**
1. Check AI recommendations in the insights panel
2. Focus on the most critical metrics first (Total Solids, Fat)
3. Use the Sugar Blend Optimizer to balance sweetness
4. Refer to product-specific guidelines above

### Can't Save Recipe

**Problem:** Save button is disabled

**Possible Causes:**
- Recipe name is empty → Enter a name
- Not authenticated → Log in from main page
- Backend unavailable → Use Export instead

**Solution:**
1. Make sure recipe has a name
2. Ensure you're logged in (check top-right corner)
3. If offline, use Export to save locally

### Ingredients Not Loading

**Problem:** Ingredient dropdown is empty or limited

**Cause:** Backend connection issue

**Solution:**
1. The default ingredients are always available
2. Check 🔧 Diagnostics tab for connection status
3. Refresh the page
4. If persistent, work with default ingredients

### Console Logs

For detailed debugging, open browser console (F12) and look for:
- 🧠 "Analyzing recipe with AI" - AI is processing
- ✅ "AI analysis complete" - Success
- ⚠️ "No recipe data to analyze" - Add ingredients
- ❌ "Error analyzing recipe" - Check console for details

## Keyboard Shortcuts

- **Tab**: Move between ingredient inputs
- **Enter**: Add new ingredient row
- **Escape**: Close dialogs
- **Ctrl/Cmd + S**: Save recipe (when enabled)

## Getting Help

If you're stuck or have questions:

1. Check console logs (F12) for specific errors
2. Review this guide for feature explanations
3. Check TROUBLESHOOTING.md for connection issues
4. Use the 🔧 Diagnostics tab to verify system status

## Best Practices

### Professional Use

1. **Version Control**
   - Save recipe versions as you iterate
   - Use descriptive names with dates
   - Export important recipes as backup

2. **Documentation**
   - Note why you made specific choices
   - Track which suggestions worked best
   - Build your own knowledge base

3. **Testing**
   - Test recipes in small batches first
   - Document results and adjustments
   - Use batch logging (Batches tab) to track production

### Learning and Improvement

1. **Experiment Systematically**
   - Change one variable at a time
   - Observe metric changes
   - Learn what affects what

2. **Study AI Recommendations**
   - Understand the reasoning
   - Apply patterns to new recipes
   - Build intuition over time

3. **Compare Products**
   - Use Recipe Compare feature
   - Analyze successful recipes
   - Identify winning patterns

## Advanced Techniques

### Creating Custom Blends

1. Use Sugar Blend Optimizer
2. Balance multiple sugar types
3. Consider both sweetness and freezing point
4. Test and refine

### Reverse Engineering

1. Input known product characteristics
2. Let AI suggest recipe
3. Adjust to match exact targets
4. Fine-tune with Chemistry Analysis

### Production Scaling

1. Develop recipe at lab scale
2. Use metrics to maintain consistency
3. Scale up proportionally
4. Monitor batch quality (Batches tab)

## Conclusion

The AI Engine is a powerful tool for recipe development. Take time to explore all features, experiment with different approaches, and learn how the AI insights can improve your recipes. With practice, you'll develop recipes faster and with better results.

**Remember:** The AI is a tool to assist you, not replace your expertise. Use it to enhance your knowledge and streamline your workflow.
