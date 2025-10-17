# Analytics & Usage Tracking

This project implements privacy-focused feature usage analytics to understand how users interact with the application without collecting any personally identifiable information (PII).

## Database Schema

### `public.events` Table

Stores anonymous or user-associated feature usage events:

```sql
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  event text NOT NULL,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);
```

- **user_id**: Optional - links events to authenticated users or NULL for anonymous
- **event**: Event name (e.g., 'ai_suggest_open', 'optimize_apply')
- **meta**: Optional JSON metadata (avoid PII)
- **created_at**: Timestamp for temporal analysis

### `public.ai_suggestion_events` Table

Specialized tracking for AI ingredient suggestions:

```sql
CREATE TABLE public.ai_suggestion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  ingredient text NOT NULL,
  reason text,
  accepted boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

## Tracked Events

### AI Features
- **ai_suggest_open**: User opens AI suggestions dialog
- **ai_suggest_accept**: User accepts an AI suggestion
- **ai_suggest_dismiss**: User dismisses a suggestion

### Optimization
- **optimize_open**: User opens optimization dialog
- **optimize_apply**: User applies optimization
- **optimize_cancel**: User cancels optimization

### Warnings & Help
- **warn_explain_open**: User requests AI explanation for a warning

### Recipe Operations
- **recipe_save**: Recipe saved
- **recipe_load**: Recipe loaded from saved recipes
- **recipe_export**: Recipe exported to CSV

### Version Control
- **version_restore**: User restores a previous version
- **version_compare**: User compares versions

### Production Mode
- **production_mode_enable**: User enables kitchen production mode
- **production_mode_print**: User prints recipe in production mode

## Usage in Code

```typescript
import { logEvent, ANALYTICS_EVENTS } from '@/lib/analytics';

// Basic event
logEvent(ANALYTICS_EVENTS.AI_SUGGEST_OPEN);

// Event with metadata (no PII!)
logEvent(ANALYTICS_EVENTS.OPTIMIZE_APPLY, {
  ingredient_count: 12,
  mode: 'gelato'
});
```

## Analytics Queries

### Most Popular Features (Last 30 Days)

```sql
SELECT 
  event,
  COUNT(*) as usage_count,
  COUNT(DISTINCT user_id) as unique_users
FROM public.events
WHERE created_at > now() - interval '30 days'
GROUP BY event
ORDER BY usage_count DESC;
```

### Top Accepted AI Suggestions (Last 30 Days)

```sql
SELECT 
  ingredient,
  COUNT(*) as acceptance_count
FROM public.ai_suggestion_events
WHERE created_at > now() - interval '30 days'
  AND accepted = true
GROUP BY ingredient
ORDER BY acceptance_count DESC
LIMIT 20;
```

### User Engagement Over Time

```sql
SELECT 
  date_trunc('day', created_at) as date,
  COUNT(*) as events,
  COUNT(DISTINCT user_id) as active_users
FROM public.events
WHERE created_at > now() - interval '90 days'
GROUP BY date
ORDER BY date;
```

### AI Feature Adoption

```sql
SELECT 
  CASE 
    WHEN event LIKE 'ai_%' THEN 'AI Features'
    WHEN event LIKE 'optimize_%' THEN 'Optimization'
    WHEN event LIKE 'version_%' THEN 'Version Control'
    ELSE 'Other'
  END as feature_category,
  COUNT(*) as usage_count
FROM public.events
WHERE created_at > now() - interval '30 days'
GROUP BY feature_category
ORDER BY usage_count DESC;
```

### Conversion Funnel: AI Suggestions

```sql
WITH funnel AS (
  SELECT 
    COUNT(*) FILTER (WHERE event = 'ai_suggest_open') as opens,
    COUNT(*) FILTER (WHERE event = 'ai_suggest_accept') as accepts,
    COUNT(*) FILTER (WHERE event = 'ai_suggest_dismiss') as dismisses
  FROM public.events
  WHERE created_at > now() - interval '30 days'
)
SELECT 
  opens,
  accepts,
  dismisses,
  ROUND(100.0 * accepts / NULLIF(opens, 0), 2) as acceptance_rate,
  ROUND(100.0 * dismisses / NULLIF(opens, 0), 2) as dismiss_rate
FROM funnel;
```

### Feature Usage by Time of Day

```sql
SELECT 
  EXTRACT(hour FROM created_at) as hour_of_day,
  COUNT(*) as events
FROM public.events
WHERE created_at > now() - interval '7 days'
GROUP BY hour_of_day
ORDER BY hour_of_day;
```

## Privacy Considerations

1. **No PII**: Never log personally identifiable information (names, emails, addresses)
2. **Optional User Linking**: Events can be anonymous (user_id = NULL)
3. **Aggregated Insights**: All queries focus on aggregate patterns, not individual behavior
4. **Fire-and-Forget**: Analytics failures never block user actions
5. **Silent Logging**: Users are not notified of analytics events

## Best Practices

1. **Keep event names consistent**: Use `ANALYTICS_EVENTS` constants
2. **Minimize metadata**: Only log what's necessary for insights
3. **Aggregate early**: Don't expose raw event streams in dashboards
4. **Respect privacy**: Never correlate with external identifiers
5. **Document new events**: Update this guide when adding tracking
