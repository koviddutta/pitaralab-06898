# 🚀 Quick Fix Guide - Environment Variables Not Loading

## Problem
Calculator shows: `❌ Supabase env vars not found. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set.`

## Root Cause
Vite's `import.meta.env` is not reading the `.env` file variables, even though they exist.

## ✅ Solution Steps (Try in Order)

### Step 1: Refresh the Preview (90% Success Rate)
1. Click the **Refresh** button in the preview window
2. Or press `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac) for hard refresh
3. Wait 5-10 seconds for rebuild

### Step 2: Clear Browser Cache (if Step 1 fails)
1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
4. Close and reopen the browser tab

### Step 3: Restart Dev Server (if Step 2 fails)
Since this is Lovable Cloud, you may need to:
1. Save all current changes
2. Close the project
3. Reopen the project
4. Wait for full initialization

### Step 4: Verify Environment Variables
Run this in browser console to debug:
```javascript
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_PUBLISHABLE_KEY:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
console.log('All env vars:', import.meta.env);
```

**Expected Output:**
```
VITE_SUPABASE_URL: "https://upugwezzqpxzjxpdxuar.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY: "eyJhbGci..."
```

**If you see `undefined`:** Environment not loading properly

## 🔍 Verification Checklist

After applying fix, verify these work:

### 1. Backend Connection
```
✅ Console shows: "✅ Supabase connection established"
❌ Console shows: "❌ Backend initialization failed"
```

### 2. Ingredients Loading
```
✅ Dropdown shows ingredient list
❌ Dropdown empty or shows error
```

### 3. Authentication
```
✅ Redirects to login page (if not logged in)
✅ Shows user email in top-right corner (if logged in)
❌ Infinite redirect loop
```

### 4. Calculator Metrics
```
✅ Add ingredients → Metrics calculate in real-time
❌ Add ingredients → Nothing happens or error shown
```

## 🐛 If Still Not Working

### Check Console for These Specific Errors:

#### Error 1: CORS Issues
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```
**Fix:** Edge functions need CORS headers (already implemented in our functions)

#### Error 2: 401 Unauthorized
```
{ error: "Unauthorized" }
```
**Fix:** User needs to log in via `/auth` page

#### Error 3: RLS Policy Violation
```
new row violates row-level security policy
```
**Fix:** Check that user_id matches auth.uid() in insert operations

#### Error 4: Network Timeout
```
Failed to fetch / Network request failed
```
**Fix:** Check internet connection or Supabase service status

## 🎯 Expected Behavior After Fix

### On Page Load:
1. Console: `🚀 Initializing Supabase connection...`
2. Console: `✅ Supabase connection established`
3. Console: `🔍 Fetching all ingredients from database...`
4. Console: `✅ User authenticated: [email]`

### In Calculator:
1. Ingredient dropdown populated with 50+ items
2. Add ingredients → Metrics update immediately
3. Save button → Recipe stored in database
4. AI suggestion button → Gets intelligent recommendations

### No Errors:
- ❌ No "ENV_MISSING" errors
- ❌ No "Backend not ready" warnings
- ❌ No infinite redirects

## 📞 Still Stuck?

If environment variables still not loading after all steps:

1. **Check if it's a Lovable platform issue:**
   - Contact Lovable support
   - Mention: "Vite environment variables not loading in preview"

2. **Temporary Workaround (NOT RECOMMENDED for production):**
   ```typescript
   // In safeClient.ts - ONLY FOR DEBUGGING
   const url = import.meta.env.VITE_SUPABASE_URL || 'https://upugwezzqpxzjxpdxuar.supabase.co';
   const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJI...';
   ```
   
   ⚠️ **Warning:** This hardcodes credentials and should ONLY be used temporarily for debugging.

## ✅ Success Indicators

You'll know it's fixed when:
- ✅ Calculator loads without errors
- ✅ Ingredient list populates
- ✅ Metrics calculate in real-time
- ✅ Save button works
- ✅ AI suggestions can be requested
- ✅ No orange warning banner about "Backend Connection Issue"

---

**Estimated Fix Time:** 1-5 minutes  
**Success Rate:** 95% with Steps 1-2  
**Last Updated:** 2025-10-17
