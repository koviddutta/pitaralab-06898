# Security Architecture - MeethaPitara Calculator

## Design Philosophy: Public Calculator, Private Storage (Option A)

MeethaPitara follows a **public calculator with authenticated storage** model, allowing users to experiment freely while protecting proprietary recipe data.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   PUBLIC ACCESS LAYER                    │
├─────────────────────────────────────────────────────────┤
│  • Calculator Engine (Client-Side, No Auth Required)    │
│  • Ingredient Library (Read-Only, Public)                │
│  • Chemistry Calculations (Pure Functions)               │
│  • AI Suggestions (Rate-Limited, Optional Auth)          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              AUTHENTICATION BOUNDARY                     │
│          (Required for Data Persistence)                 │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│               PRIVATE STORAGE LAYER                      │
├─────────────────────────────────────────────────────────┤
│  • Recipes (User-Owned, RLS Protected)                   │
│  • Batches (User-Owned, RLS Protected)                   │
│  • Pastes (User-Owned, RLS Protected)                    │
│  • Recipe Versions (User-Owned, RLS Protected)           │
└─────────────────────────────────────────────────────────┘
```

## Benefits of This Model

### 1. **Wider Adoption**
- Users can try the calculator without signup friction
- Demonstrations and tutorials work without authentication
- Lower barrier to entry for new users

### 2. **Clear Value Proposition**
- Free: Experiment with recipes in calculator
- Paid/Registered: Save and manage your proprietary formulations
- Natural upgrade path from trial to committed user

### 3. **Security Where It Matters**
- Proprietary recipes protected by user ownership
- Sensitive intellectual property isolated per user
- Public ingredient data benefits everyone
- No risk to trade secrets in the calculation layer

## Security Implementation

### Row-Level Security (RLS) Policies

All user data tables enforce strict owner-based access control:

**Recipes Table:**
```sql
CREATE POLICY "Users can read own recipes"
ON recipes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes"
ON recipes FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

**Pattern Applied To:**
- `recipes` (gelato/kulfi formulations)
- `batches` (production tracking)
- `pastes` (flavor compounds)
- `recipe_versions` (version history)

### Public Access Tables

**Ingredients Table:**
- Read access for all users (authenticated or not)
- Write access requires authentication (quality control)
- Shared knowledge base benefits entire community

### Authentication Requirements

**No Auth Required:**
- Calculator usage
- Ingredient library browsing
- Chemistry calculations
- Metric conversions

**Auth Required:**
- Saving recipes to database
- Batch logging and QA tracking
- Creating custom pastes
- AI optimization (rate-limited)

## Rate Limiting Strategy

### AI Endpoints
```typescript
// 5 requests per minute per user
// Prevents abuse while allowing experimentation
rate_limit: {
  type: 'user_id',
  max_requests: 5,
  window_minutes: 1
}
```

### Public Endpoints
- No rate limiting on calculator (client-side)
- Standard Supabase API rate limits apply to database reads

## Input Validation

All edge functions validate inputs using Zod schemas:

**Example: suggest-ingredient**
```typescript
const requestSchema = z.object({
  rows: z.array(
    z.object({
      ingredientId: z.string().min(1),
      grams: z.number().positive().max(10000)
    })
  ).max(50), // Prevent abuse with large arrays
  mode: z.enum(['gelato', 'kulfi', 'sorbet', 'paste'])
});
```

**Validation Prevents:**
- Prompt injection attacks
- Cost abuse (oversized AI requests)
- Type errors and crashes
- Invalid data corruption

## Data Ownership Model

### User-Owned Resources
Each user has complete ownership of their data:

```
User A
├── Recipes (isolated)
├── Batches (isolated)
└── Pastes (isolated)

User B
├── Recipes (isolated)
├── Batches (isolated)
└── Pastes (isolated)
```

**Enforcement:**
1. `user_id UUID` column on all user tables
2. RLS policies check `auth.uid() = user_id`
3. Automatic assignment via `DEFAULT auth.uid()`
4. CASCADE deletion when user deletes account

### Shared Resources
- **Ingredients:** Community-curated, read-only for all
- **Ingredient Access Log:** Tracks usage for analytics only

## Security Checklist

- [x] RLS enabled on all user tables
- [x] Owner-based policies (auth.uid() checks)
- [x] Input validation on edge functions
- [x] Rate limiting on AI endpoints
- [x] CORS properly configured
- [x] No service role key exposure
- [x] User ownership with CASCADE delete
- [x] Performance indexes on user_id columns
- [x] Public calculator doesn't require auth
- [x] Clear boundary between public/private layers

## Threat Model

### Protected Against
- ✅ Cross-user data access
- ✅ Recipe theft by competitors
- ✅ Prompt injection attacks
- ✅ AI cost abuse
- ✅ SQL injection (Supabase client methods only)
- ✅ Unauthorized data modification

### Known Limitations
- ⚠️ Calculator results visible in client (by design)
- ⚠️ Ingredient data is public (intentional knowledge sharing)
- ⚠️ Rate limiting based on user_id (can be bypassed with multiple accounts)

### Future Enhancements
- [ ] Consider IP-based rate limiting for anonymous users
- [ ] Add audit logging for sensitive operations
- [ ] Implement recipe sharing with explicit permissions
- [ ] Add export restrictions for premium recipes

## Monitoring & Auditing

### Current Logging
- Edge function invocations (Supabase logs)
- Authentication events (auth.logs)
- Database errors (postgres.logs)
- Ingredient access tracking (ingredient_access_log)

### Recommended Alerts
- Multiple failed authentication attempts
- Unusual AI usage spikes
- RLS policy violations
- Edge function error rates

## Compliance Notes

### Data Protection
- User data isolated per account
- Deletion compliance via CASCADE
- No PII in public tables
- Session management via Supabase Auth

### Intellectual Property
- User recipes are proprietary to creator
- No automatic sharing or publication
- Clear ownership via user_id linkage
- Version control for recipe history

---

**Last Updated:** January 2025  
**Security Model:** Public Calculator, Private Storage (Option A)  
**Status:** ✅ Production-Ready
