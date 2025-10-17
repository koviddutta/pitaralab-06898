# ✅ Calculator Test Checklist

Run this comprehensive checklist after fixing the environment variable issue.

## 🚦 Pre-Test Requirements

- [ ] Environment variables loading (no "ENV_MISSING" errors)
- [ ] User logged in (or can access login page)
- [ ] Browser console open (F12) to monitor logs
- [ ] Stable internet connection

---

## 1️⃣ Basic Functionality Tests

### Page Load
- [ ] Calculator page loads without errors
- [ ] No orange "Backend Connection Issue" banner
- [ ] Tab navigation works (📊 Calculator, 🤖 AI Engine, etc.)
- [ ] User email shown in top-right dropdown
- [ ] Console shows: "✅ Supabase connection established"

### Ingredient Selection
- [ ] Click "Add Ingredient" button
- [ ] Dropdown shows 50+ ingredients
- [ ] Search filters ingredients correctly
- [ ] Selected ingredient appears in table
- [ ] Grams input accepts numbers
- [ ] Can add multiple ingredients

### Real-Time Calculations
- [ ] Add "Milk 3%" (600g) → See metrics update
- [ ] Add "Sucrose" (120g) → Total sugars increases
- [ ] Add "Cream 35%" (200g) → Fat percentage updates
- [ ] Metrics update within 300ms (debounced)
- [ ] No console errors during calculation

---

## 2️⃣ Metrics Accuracy Tests

### Test Recipe: Classic Vanilla Gelato
```
Milk 3% Fat: 600g
Cream 35% Fat: 200g
Sucrose: 120g
Skim Milk Powder: 30g
Stabilizer: 5g
Total: 955g
```

#### Expected Results (±0.5%):
- [ ] Fat: 7-8%
- [ ] MSNF: 10-11%
- [ ] Total Sugars: 18-20%
- [ ] Total Solids: 36-38%
- [ ] Water: 62-64%
- [ ] FPDT: 2.0-2.5°C

### Boundary Tests
- [ ] Recipe with 0g ingredients → Shows warning
- [ ] Recipe with only water → Correct 100% water
- [ ] Recipe with only sugar → Correct 100% total solids
- [ ] High lactose recipe (>11%) → Warning shown
- [ ] Very high sugar (>30%) → Warning shown

---

## 3️⃣ Mode Switching Tests

### Gelato Mode
- [ ] Switch to "Gelato" mode
- [ ] Target ranges: Fat 6-9%, MSNF 10-12%
- [ ] Metrics recalculate correctly
- [ ] Warnings adjust for gelato targets

### Kulfi Mode
- [ ] Switch to "Kulfi" mode
- [ ] Target ranges: Fat 10-12%, MSNF 18-25%
- [ ] Metrics recalculate correctly
- [ ] Warnings adjust for kulfi targets

---

## 4️⃣ Save & Load Tests

### Save Recipe
- [ ] Enter recipe name: "Test Vanilla"
- [ ] Click Save button
- [ ] Success toast appears
- [ ] Console: No errors
- [ ] Recipe appears in browser (Open Browser Drawer)

### Load Recipe
- [ ] Open Recipe Browser
- [ ] See "Test Vanilla" in list
- [ ] Click recipe name
- [ ] Ingredients load correctly
- [ ] Metrics match original
- [ ] Recipe name populated

### Version Control
- [ ] Save recipe twice (same name)
- [ ] Version increments (v1 → v2)
- [ ] Click "Versions" button
- [ ] Both versions listed
- [ ] Can load older version

### Draft Auto-Save
- [ ] Create recipe (don't save)
- [ ] Wait 30 seconds
- [ ] Refresh page
- [ ] Draft restored automatically
- [ ] Toast: "Draft Restored"

---

## 5️⃣ AI Features Tests

### AI Ingredient Suggestions
- [ ] Create incomplete recipe (only milk + sugar)
- [ ] Click "AI Suggest" button (✨ Sparkles icon)
- [ ] Loading spinner appears
- [ ] Counter shows: "AI Uses Left Today: X/10"
- [ ] Suggestions appear in dialog
- [ ] Each suggestion has:
  - [ ] Ingredient name
  - [ ] Recommended grams
  - [ ] Clear reason/justification
- [ ] Click "Add" on suggestion
- [ ] Ingredient added to table
- [ ] Metrics recalculate

#### Test Rate Limiting:
- [ ] Request AI suggestion 10 times
- [ ] 11th request shows rate limit message
- [ ] Counter shows: "0/10 remaining"

### AI Warning Explanations
- [ ] Create recipe with warning (e.g., high lactose)
- [ ] Warning appears in panel
- [ ] Click "Explain" button on warning
- [ ] AI explanation loads
- [ ] Explanation is relevant and helpful
- [ ] Includes mitigation suggestions

---

## 6️⃣ Science Panel Tests

### Thermo-Metrics
- [ ] Create valid recipe
- [ ] Click "Science" tab/section
- [ ] Thermo-metrics panel visible
- [ ] Shows:
  - [ ] Sucrose Equivalents (SE)
  - [ ] Freezing Point Depression (FPDT)
  - [ ] Water Frozen %
  - [ ] Serving Temperature
- [ ] Adjust serving temp slider
- [ ] Metrics recalculate in real-time

### FPDT Chart
- [ ] FPDT chart renders
- [ ] Shows freezing curve
- [ ] X-axis: Temperature (°C)
- [ ] Y-axis: Water Frozen (%)
- [ ] Current serving temp marked
- [ ] Hover shows tooltip with exact values

---

## 7️⃣ Production Mode Tests

### Toggle Production Mode
- [ ] Click Production Mode toggle (top-right)
- [ ] UI transforms:
  - [ ] Larger fonts
  - [ ] Higher contrast
  - [ ] Touch-optimized buttons
  - [ ] Print-friendly layout
- [ ] Query param: `?production=1` appears in URL
- [ ] Refresh page → Mode persists
- [ ] Toggle off → Returns to normal

---

## 8️⃣ Mobile/Responsive Tests

### Mobile Layout (< 768px width)
- [ ] Resize browser to mobile width
- [ ] Tab list scrolls horizontally
- [ ] All tabs accessible via swipe
- [ ] Ingredient table responsive
- [ ] Metrics cards stack vertically
- [ ] Bottom action bar appears
- [ ] Touch targets ≥ 44px

### Tablet Layout (768px - 1024px)
- [ ] Metrics display in 2-3 columns
- [ ] Comfortable spacing
- [ ] No horizontal scroll

---

## 9️⃣ Error Handling Tests

### Network Errors
- [ ] Disable internet
- [ ] Try to save recipe
- [ ] Error toast appears
- [ ] Error message is clear
- [ ] Re-enable internet → Retry works

### Invalid Data
- [ ] Enter negative grams → Rejected or warning
- [ ] Enter non-numeric grams → Rejected
- [ ] Delete all ingredients → Warning shown
- [ ] Select invalid ingredient ID → Handled gracefully

### API Failures
- [ ] Request AI suggestion with network disabled
- [ ] Error message shown (not blank screen)
- [ ] Fallback suggestions offered (if implemented)

---

## 🔟 Performance Tests

### Load Time
- [ ] Page loads < 3 seconds (first visit)
- [ ] Page loads < 1 second (cached)
- [ ] No flash of unstyled content (FOUC)

### Calculation Speed
- [ ] Add ingredient → Metrics update < 500ms
- [ ] Change grams → Metrics update < 500ms
- [ ] Switch mode → Instant recalculation

### Memory Usage
- [ ] Open DevTools → Performance tab
- [ ] Record while using calculator
- [ ] No memory leaks after 5 minutes use
- [ ] No excessive re-renders (< 10 per interaction)

---

## 1️⃣1️⃣ Edge Cases

### Extreme Values
- [ ] Recipe with 10,000g total → Handles correctly
- [ ] Recipe with 0.01g ingredient → Shows warning
- [ ] Recipe with 99% fat → Red warning
- [ ] Recipe with 0% water → Error or warning

### Special Ingredients
- [ ] Add "Glucose Syrup DE42" → DE factor applies
- [ ] Add "Fruit Puree" → Sugar split calculated
- [ ] Add "Stabilizer" → Other solids tracked
- [ ] Add "Alcohol" → Freezing point effect

### Multiple Users (if testable)
- [ ] User A saves recipe
- [ ] User B cannot see User A's private recipe
- [ ] RLS policies enforced
- [ ] No data leakage

---

## 1️⃣2️⃣ Accessibility Tests

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Focus indicators visible
- [ ] Enter key activates buttons
- [ ] Escape key closes dialogs

### Screen Reader (if available)
- [ ] Enable screen reader (NVDA/JAWS/VoiceOver)
- [ ] All buttons announced correctly
- [ ] Metrics updates announced
- [ ] Errors announced
- [ ] ARIA labels present

### Color Contrast
- [ ] Open DevTools → Lighthouse → Accessibility
- [ ] Score ≥ 90/100
- [ ] No contrast violations
- [ ] Text readable in light/dark mode

---

## 1️⃣3️⃣ Browser Compatibility

### Chrome/Edge (Chromium)
- [ ] All features work
- [ ] No console warnings

### Firefox
- [ ] All features work
- [ ] No console warnings

### Safari (if available)
- [ ] All features work
- [ ] No console warnings

---

## 📊 Test Results Template

| Category | Tests | Passed | Failed | Notes |
|----------|-------|--------|--------|-------|
| Basic Functionality | 15 | __ | __ | |
| Metrics Accuracy | 10 | __ | __ | |
| Mode Switching | 8 | __ | __ | |
| Save & Load | 12 | __ | __ | |
| AI Features | 10 | __ | __ | |
| Science Panel | 10 | __ | __ | |
| Production Mode | 8 | __ | __ | |
| Mobile/Responsive | 8 | __ | __ | |
| Error Handling | 8 | __ | __ | |
| Performance | 6 | __ | __ | |
| Edge Cases | 8 | __ | __ | |
| Accessibility | 8 | __ | __ | |
| Browser Compat | 6 | __ | __ | |
| **TOTAL** | **117** | __ | __ | |

---

## ✅ Sign-Off

**Tester Name:** __________________  
**Date:** __________________  
**Build Version:** __________________  
**Pass Rate:** _____ % (minimum 95% required)

**Approved for Production?** ☐ YES  ☐ NO

**Notes:**
```
___________________________________________
___________________________________________
___________________________________________
```

---

## 🚀 Deployment Readiness

### Before Going Live:
- [ ] All P0 bugs fixed
- [ ] 95%+ test pass rate
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] User acceptance testing complete
- [ ] Documentation updated
- [ ] Backup/rollback plan ready

---

**Last Updated:** 2025-10-17  
**Version:** 1.0
