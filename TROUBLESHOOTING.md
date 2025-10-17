# MeethaPitara Troubleshooting Guide

## Backend Connection Issues

If you see "Backend Unavailable" or "Running in offline mode" messages:

### Step 1: Check Console Logs

Open the browser console (F12) and look for these emoji-marked logs:

- 🔍 **Checking Supabase env vars** - Should show both url and key as "SET"
- ✅ **Supabase connection established** - Backend is working
- ❌ **Supabase env vars not found** - Environment variables are missing

### Step 2: Verify Environment Variables

The app requires these environment variables to be set:

```
VITE_SUPABASE_URL=https://upugwezzqpxzjxpdxuar.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
VITE_SUPABASE_PROJECT_ID=upugwezzqpxzjxpdxuar
```

**For Lovable Cloud Projects:** These are auto-managed and should be set automatically.

### Step 3: Authentication Issues

If the backend connects but you see "No session found":

1. Navigate to the `/auth` page
2. Sign up or log in with your email
3. Check your email for verification (if required)
4. Return to the main calculator page

### Step 4: Clear Browser Cache

Sometimes old cached data can cause issues:

1. Open DevTools (F12)
2. Go to Application > Storage
3. Click "Clear site data"
4. Refresh the page

## Feature-Specific Issues

### Calculator Tab Not Loading Templates

**Symptoms:** Empty state or loading spinner that never completes

**Solution:**
1. Check console logs for ingredient fetching errors
2. Verify you're authenticated (check top-right corner for email)
3. If offline mode is shown, backend connection needs to be fixed first

### AI Insights Tab Not Working

**Symptoms:** Shows "Backend Unavailable" message

**Solution:**
1. AI Engine requires active backend connection
2. Follow "Backend Connection Issues" steps above
3. Ensure ingredients are loaded in the database

### Save Recipe Button Disabled

**Symptoms:** Can't save recipes

**Possible causes:**
- Recipe name is empty (required)
- Not authenticated
- No ingredients in the recipe
- Backend connection issue

**Solution:**
1. Enter a recipe name
2. Add at least one ingredient
3. Ensure you're logged in

## Database Issues

### No Ingredients Available

**Symptoms:** Ingredient dropdown is empty

**Solution:**
1. Check if you're authenticated
2. Verify database has ingredient data
3. Check console for "Fetched X ingredients" log

### Can't Save Data

**Symptoms:** Error messages when saving

**Possible causes:**
- RLS policies preventing access
- Missing authentication
- Invalid data format

**Solution:**
1. Ensure you're logged in
2. Check console for specific error messages
3. Verify data meets validation requirements

## Performance Issues

### Slow Loading

**Symptoms:** App takes long to load or respond

**Optimization tips:**
1. Clear browser cache
2. Disable browser extensions
3. Use production mode toggle for cleaner interface
4. Close unnecessary tabs

### Mobile Performance

**Symptoms:** Laggy on mobile devices

**Tips:**
1. Use the mobile-optimized input components
2. Collapse sections you're not using
3. Use "Quick Add" tab for faster ingredient entry

## AI Feature Issues

### AI Suggest Ingredient Not Working

**Symptoms:** Button clicks but nothing happens

**Possible causes:**
- Rate limit reached (10/hour)
- Not authenticated
- Recipe is empty
- Backend connection issue

**Solution:**
1. Check AI usage counter in top-right
2. Ensure you're logged in
3. Add at least one ingredient to recipe
4. Check console for specific error

### AI Usage Counter Shows 0/10

**Symptoms:** "Rate limit reached" message

**Solution:**
1. Wait for hourly reset (timer shows remaining time)
2. Use other calculator features in the meantime
3. Plan AI requests strategically

### Warning Explanation Button Missing

**Symptoms:** No "?" button next to warnings

**Possible causes:**
- Not authenticated
- Backend unavailable
- Old cached version

**Solution:**
1. Log in to enable AI features
2. Check backend connection status
3. Clear cache and refresh page

### AI Requests Timing Out

**Symptoms:** Loading spinner never completes

**Possible causes:**
- Network issues
- AI service overload
- Large recipe complexity

**Solution:**
1. Check network connection
2. Wait and retry (automatic retry happens)
3. Simplify recipe if very complex
4. Check console for timeout errors

### AI Suggestions Not Relevant

**Symptoms:** Suggestions don't make sense for your recipe

**Possible causes:**
- Incomplete recipe context
- Unusual product type
- Edge case ingredients

**Solution:**
1. Add more base ingredients first
2. Verify product type is selected
3. Use manual ingredient search instead
4. Try AI Optimize instead of Suggest

## Getting Help

If issues persist:

1. Check the browser console (F12) for error messages
2. Copy any error logs
3. Note what you were trying to do when the error occurred
4. Check AI usage counter status
5. Verify authentication status
6. Report the issue with these details

## Diagnostic Console Commands

Open browser console and run:

```javascript
// Check if backend is ready
console.log('Backend ready:', window.location.hostname);

// Check environment variables
console.log({
  url: import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'MISSING',
  key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'SET' : 'MISSING'
});

// Check localStorage
console.log('LocalStorage:', localStorage);
```

## Common Error Messages

### "ENV_MISSING"
- Environment variables not configured
- For Lovable Cloud, this should auto-resolve
- Try refreshing the page

### "Running in offline mode"
- Backend connection failed
- Check network connection
- Verify environment variables

### "No session found"
- Not authenticated
- Navigate to /auth to log in

### "Failed to fetch ingredients"
- Database query failed
- Check authentication
- Verify RLS policies

## Reset Everything

If all else fails, complete reset:

1. Log out (top-right dropdown)
2. Clear browser storage (DevTools > Application > Clear site data)
3. Close all browser tabs with the app
4. Open a new tab and navigate to the app
5. Log in again

This will clear all cached data and force a fresh start.
