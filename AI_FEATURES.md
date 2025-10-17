# AI Features Documentation

## Overview

MeethaPitara Calculator includes comprehensive AI-powered features that help users create better recipes faster. All AI features use **Google Gemini 2.5 Flash** through Lovable AI Gateway with no API key required.

## Available AI Features

### 1. AI Suggest Ingredient 🎯

**Purpose:** Get intelligent ingredient recommendations based on your current recipe context.

**How to Use:**
1. Build your recipe in the calculator
2. Click "AI Suggest Ingredient" button
3. Wait for AI analysis (2-5 seconds)
4. Review 3-5 contextualized suggestions
5. Click any suggestion to add it to your recipe

**What It Considers:**
- Current ingredient composition
- Product type (Ice Cream, Gelato, Sorbet)
- Target metrics (Fat, MSNF, Total Solids, etc.)
- Flavor compatibility
- Texture requirements
- Missing functional ingredients

**Example Suggestions:**
```
Suggestion: Milk Powder (MSNF)
Rationale: Your MSNF is at 7.2%, below the target of 9-12%. 
Adding milk powder will improve body and texture.
Recommended Amount: 20-30g
```

**Rate Limit:** 10 requests per hour per user

---

### 2. AI Optimize Recipe 🚀

**Purpose:** Automatically improve recipe balance for better texture, flavor, and composition.

**How to Use:**
1. Create your recipe
2. Click "AI Optimize Recipe" button
3. Review before/after comparison
4. See specific improvements made
5. Apply or dismiss changes

**What It Optimizes:**
- Composition balance (Total Solids, Fat, MSNF)
- Sugar types and ratios
- Freezing point depression
- Ingredient proportions
- Flavor intensity
- Texture characteristics

**Optimization Goals:**
- Maintain recipe identity
- Stay within product-specific targets
- Improve texture metrics
- Balance sweetness
- Enhance mouthfeel

**Rate Limit:** 10 requests per hour per user

---

### 3. AI Explain Warning ⚠️

**Purpose:** Understand formulation warnings and get actionable fixes.

**How to Use:**
1. Look at warnings panel (shown when issues detected)
2. Click "?" button next to any warning
3. Read detailed explanation
4. Review recommended fixes
5. Apply suggestions to your recipe

**Warning Types Explained:**
- **Composition Issues**: Fat too low/high, MSNF imbalance
- **Texture Defects**: Iciness, chewiness, sandiness
- **Freezing Point**: FPDT outside target range
- **Processing Concerns**: Overrun issues, aging requirements
- **Flavor Problems**: Sweetness imbalance, off-flavors

**Example Explanation:**
```
Warning: Fat content too low (4.2%)

Why This Matters:
Low fat content can lead to icy texture and poor mouthfeel. 
Fat provides richness, creaminess, and helps incorporate air.

Recommended Fixes:
1. Add 30-40g cream (35% fat) to reach 6-8% fat
2. Consider adding 10-15g milk powder for body
3. Adjust water content to maintain total solids

Science Behind It:
Fat coats ice crystals, preventing them from clumping 
and creating a smooth texture. Target: 6-18% depending 
on product type.
```

**Rate Limit:** 10 requests per hour per user

---

### 4. Paste Formulator (AI Paste Studio) 🧪

**Purpose:** Generate scientific paste recipes with proper preservation and cost optimization.

**How to Use:**
1. Navigate to Paste Studio tab
2. Enter paste requirements (flavor, solids, etc.)
3. Click "Generate Paste Recipe"
4. Review AI-generated formulation
5. See citations and validation

**Features:**
- Scientific formulations
- Industry benchmark validation
- Preservation methods
- Cost optimization
- Shelf life recommendations
- Processing instructions

**Example Output:**
```
Mango Paste (70% Solids)
- Mango puree: 500g
- Sugar: 350g
- Citric acid: 3g
- Potassium sorbate: 1g

Preservation: Pasteurize at 85°C for 15 minutes
Shelf Life: 6 months refrigerated, 12 months frozen
Citations: [Industry Standard XYZ, Research Paper ABC]
```

---

### 5. Thermo Metrics (Advanced) 🌡️

**Purpose:** Advanced thermal property calculations for scientific formulation.

**Endpoint:** `/thermo-metrics`

**Calculations:**
- Freezing Point Depression (FPDT)
- Draw temperature optimization
- Serving temperature recommendations
- Hardness prediction
- Scoopability index

**Used By:**
- Temperature Panel
- Science Metrics Panel
- Machine Guidance

---

## AI Usage Tracking

### Rate Limiting

**Default Limits:**
- 10 AI requests per hour per authenticated user
- Automatic reset after 1 hour
- Shared across all AI features

**Why Rate Limiting:**
- Prevent abuse of AI resources
- Ensure fair usage across all users
- Control costs
- Maintain service availability

### Usage Counter UI

**Location:** Top-right of calculator interface

**Display:**
```
AI Uses: 7/10 remaining
[███████░░░] 70%
Resets in: 23 minutes
```

**States:**
- **Green (7-10 remaining)**: Normal usage
- **Yellow (4-6 remaining)**: Approaching limit
- **Orange (1-3 remaining)**: Near limit
- **Red (0 remaining)**: Limit reached, wait for reset

### Usage Logs

All AI requests are logged in `ai_usage_log` table:

**Tracked Information:**
- User ID
- Function called
- Request timestamp
- Input parameters (sanitized)
- Response status
- Error details (if any)

**Privacy:**
- Users can only see their own logs
- No sensitive data stored
- Logs used for debugging and analytics

---

## Error Handling

### Retry Logic

**Automatic Retries:**
- Max 3 attempts per request
- Exponential backoff (1s, 2s, 4s)
- Only retries on network/timeout errors
- No retry on rate limit or validation errors

### Error Types

#### 1. Rate Limit Exceeded (429)
```
⚠️ AI request limit reached (10/hour)
Please wait 15 minutes and try again.
```

**What to do:** Wait for usage to reset, use other calculator features

#### 2. Credits Exhausted (402)
```
❌ AI credits exhausted for this account
Please contact support or upgrade plan.
```

**What to do:** Contact administrator

#### 3. Network Timeout
```
⚠️ Request timed out. Retrying...
Attempt 2 of 3
```

**What happens:** Automatic retry with backoff

#### 4. Validation Error
```
❌ Invalid input: Recipe must have at least one ingredient
```

**What to do:** Fix input and try again

#### 5. AI Service Error
```
❌ AI service temporarily unavailable
Try again in a few moments.
```

**What to do:** Wait and retry, or use offline features

---

## Best Practices

### Efficient AI Usage

1. **Batch Your Changes**
   - Make multiple edits before requesting AI analysis
   - Avoid requesting suggestions after every small change

2. **Use Appropriate Features**
   - Use Suggest for adding ingredients
   - Use Optimize for overall improvements
   - Use Explain for understanding issues

3. **Monitor Your Usage**
   - Check usage counter regularly
   - Plan AI requests during your session
   - Save important results

4. **Fallback to Manual**
   - If rate limited, use manual ingredient search
   - Refer to glossary for explanations
   - Use existing knowledge base

### Getting Better Results

1. **Provide Context**
   - Build a base recipe before asking for suggestions
   - Include product type and targets
   - Add at least 3-4 core ingredients

2. **Be Specific**
   - When optimizing, know what you want to improve
   - Focus on one issue at a time
   - Review warnings before asking for explanations

3. **Iterate Thoughtfully**
   - Apply AI suggestions incrementally
   - Test and validate changes
   - Don't blindly accept all recommendations

4. **Learn from AI**
   - Read rationales carefully
   - Understand the science behind suggestions
   - Build your own expertise over time

---

## Technical Implementation

### Architecture

```
User Interface
    ↓
fetchWithRetry() (exponential backoff)
    ↓
Lovable Cloud Edge Function
    ↓
Lovable AI Gateway
    ↓
Google Gemini 2.5 Flash
```

### Request Flow

1. **User Action**: Clicks AI button
2. **UI Validation**: Checks usage limit, validates input
3. **API Call**: POST to edge function with retry logic
4. **AI Processing**: Gemini analyzes and generates response
5. **Response Handling**: Parse, validate, display to user
6. **Usage Logging**: Record request in `ai_usage_log`

### Security

**Input Sanitization:**
- All inputs validated before sending to AI
- Maximum input sizes enforced
- Dangerous characters escaped
- Context isolation per request

**Output Validation:**
- AI responses validated against schema
- Malicious content filtered
- Reasonable bounds checked
- Type safety enforced

**Rate Limiting:**
- Per-user, per-hour limits
- Enforced at database level (RLS)
- Automatic reset mechanism
- Admin override available

---

## Troubleshooting

### "AI features not working"

**Possible Causes:**
1. Not authenticated → Log in
2. Rate limit reached → Wait for reset
3. Backend unavailable → Check connection
4. Browser cache issue → Clear and refresh

**Solutions:**
1. Verify authentication (check top-right email)
2. Check usage counter for remaining requests
3. Look for backend status indicator
4. Try in incognito mode

### "Suggestions not relevant"

**Possible Causes:**
1. Incomplete recipe context
2. Unusual ingredient combinations
3. AI misinterpretation

**Solutions:**
1. Add more base ingredients first
2. Provide clearer product type
3. Try optimizing instead of suggesting
4. Manually search ingredients

### "Rate limit reached too quickly"

**Possible Causes:**
1. Multiple rapid requests
2. Shared account
3. Testing/debugging

**Solutions:**
1. Wait for hourly reset
2. Use one account per user
3. Plan AI usage strategically
4. Use offline features between requests

---

## Future Enhancements

**Planned Features:**
- [ ] AI recipe comparison
- [ ] AI flavor pairing suggestions
- [ ] AI cost optimization
- [ ] AI allergen substitution
- [ ] AI nutritional label generation
- [ ] AI batch scaling calculator
- [ ] Increased rate limits for premium users
- [ ] AI learning from user feedback

**Community Requests:**
- Export AI suggestions history
- Save favorite AI recommendations
- AI recipe library generation
- Collaborative AI sessions
- Voice-activated AI commands

---

## Support

**For AI Issues:**
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review console logs (F12)
3. Check usage counter status
4. Verify authentication

**For Feature Requests:**
1. Document your use case
2. Explain expected behavior
3. Provide example recipes
4. Submit via GitHub Issues

**For Bugs:**
1. Note exact steps to reproduce
2. Include error messages
3. Provide browser/environment details
4. Share recipe data (if possible)

---

**Last Updated:** January 2025  
**Version:** 2.0 (AI Integration Phase Complete)
