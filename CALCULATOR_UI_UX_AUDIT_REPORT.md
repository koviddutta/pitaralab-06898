# Recipe Calculator V2 - Comprehensive UI/UX Audit Report

**Date**: 2025-11-08  
**Component**: `RecipeCalculatorV2.tsx`  
**Scope**: Interface review, user flows, phase integration, and UX recommendations

---

## Executive Summary

**Overall Grade**: B+ (Good, with room for improvement)

The Recipe Calculator V2 is functional and feature-rich, but has several UX issues that could significantly improve user experience. The advanced balancing engine (Phases 1-6) works well under the hood but lacks user-facing controls and transparency.

### Key Findings:
- ✅ Core functionality working correctly
- ✅ Phases 1-6 integrated and functional
- ⚠️ Limited visual feedback and transparency
- ⚠️ Inconsistent z-index management
- ⚠️ Mobile responsiveness issues
- ⚠️ Missing accessibility features
- ⚠️ No user controls for advanced features

---

## 1. Phase Integration Verification

### Phase 1: Multi-Role Classification ✅
**Status**: Implemented and working  
**Location**: `src/lib/optimize.engine.v2.ts` (lines 15-123)

**Integration Points**:
```typescript
// Called internally by balanceRecipeV2
classifyRecipeIngredients(rows) → IngredientClassification[]
```

**Verification**:
- ✅ Ingredients classified by roles (fat_source, msnf_source, water_source, sugar_source, stabilizer, flavor)
- ✅ Flexibility scoring (0.0-1.0) calculated correctly
- ✅ Automatic locking of stabilizers and flavors
- ✅ Multi-role support (e.g., milk is both water_source and msnf_source)

**Issue**: Classification results NOT exposed to users - they work silently in background

### Phase 2: Substitution Rules Engine ✅
**Status**: Implemented with 65+ rules  
**Location**: `src/lib/optimize.engine.v2.ts` (lines 150-352)

**Integration Points**:
```typescript
// Used by balanceRecipeV2 during iterative optimization
OptimizeEngineV2.findRules(parameter, direction, ingredients)
OptimizeEngineV2.applySubstitution(rows, rule, ingredients, amount)
```

**Verification**:
- ✅ Fat reduction/increase rules working
- ✅ MSNF reduction/increase rules working
- ✅ Priority-based rule selection
- ✅ Ratio calculations correct
- ✅ Multi-ingredient substitutions supported

**Issue**: Substitution decisions NOT shown to users - no transparency into what changed

### Phase 3: Linear Programming Solver ✅
**Status**: Fully functional with fallback  
**Location**: `src/lib/optimize.balancer.v2.ts` (lines 35-177)

**Integration**:
```typescript
// RecipeCalculatorV2.balanceRecipe() → balanceRecipeV2() → balanceRecipeLP()
useLPSolver: true  // Enabled by default
```

**Verification**:
- ✅ Simplex solver working correctly
- ✅ Constraint formulation accurate
- ✅ Fallback to heuristic on failure
- ✅ Weight preservation (within 1g)
- ✅ Toast notifications show strategy used

**Issue**: Users don't know WHEN LP was used vs heuristic (toast shows it but disappears quickly)

### Phase 6: Science Validation ✅
**Status**: Fully implemented with UI component  
**Location**: `src/lib/optimize.balancer.v2.ts` (lines 292-504), `src/components/ScienceValidationPanel.tsx`

**Integration**:
```typescript
enableScienceValidation: true  // Enabled by default
<ScienceValidationPanel validations={...} qualityScore={...} />
```

**Verification**:
- ✅ Product-specific constraints correct
- ✅ Four-tier severity system working
- ✅ Quality grading (A-F) calculated
- ✅ Visual panel renders properly
- ✅ Color-coded warnings displayed

**Strength**: This is the ONLY phase with user-facing UI!

---

## 2. UI/UX Issues Identified

### 🔴 CRITICAL Issues

#### 2.1 Inconsistent Z-Index Management
**Severity**: High  
**Impact**: Dropdowns may overlap or appear behind other elements

**Current State**:
```typescript
// RecipeCalculatorV2.tsx
<SelectContent className="bg-popover z-[100]">     // Line 569
<PopoverContent className="... z-[100] bg-popover"> // Line 647

// AddIngredientDialog.tsx  
<DialogContent className="... z-[200]">            // Line 126
<SelectContent className="z-[200] ...">            // Line 156

// Base select.tsx component
<SelectPrimitive.Content className="... z-50 ..."> // Line 76
```

**Problems**:
1. ❌ Inconsistent z-index values (z-50, z-[100], z-[200])
2. ❌ Custom z-index overrides base component styling
3. ❌ No clear z-index hierarchy documented
4. ⚠️ May cause stacking context issues

**Recommended Solution**:
```typescript
// Define z-index hierarchy in tailwind.config.ts
zIndex: {
  'dropdown': '50',
  'popover': '60',
  'dialog': '70',
  'toast': '80',
  'tooltip': '90'
}

// Then use consistently:
<SelectContent className="bg-popover border shadow-md">  // Uses z-50 from base
<PopoverContent className="bg-popover border shadow-md"> // Uses z-[60]
<DialogContent className="bg-background border shadow-lg z-[70]">
```

#### 2.2 Table Not Responsive for Mobile
**Severity**: High  
**Impact**: Unusable on mobile devices

**Current State**:
```typescript
<Table> // Line 616
  <TableHeader>
    <TableRow>
      <TableHead>Ingredient</TableHead>      // 8 columns total!
      <TableHead>Qty (g)</TableHead>
      <TableHead>Sugars (g)</TableHead>
      <TableHead>Fat (g)</TableHead>
      <TableHead>MSNF (g)</TableHead>
      <TableHead>Other (g)</TableHead>
      <TableHead>T.Solids (g)</TableHead>
      <TableHead>Action</TableHead>
    </TableRow>
  </TableHeader>
</Table>
```

**Problems**:
1. ❌ 8 columns won't fit on mobile screens
2. ❌ No horizontal scroll wrapper
3. ❌ No mobile-optimized layout alternative
4. ❌ Input fields too small for touch targets

**Recommended Solution**: Implement card-based mobile layout or use MobileIngredientRow pattern

#### 2.3 Missing Error Boundaries
**Severity**: Medium  
**Impact**: Crashes could break entire calculator

**Current State**: No error boundary wrapping calculator

**Recommended**: Wrap in ErrorBoundary with fallback UI

### ⚠️ HIGH Priority Issues

#### 2.4 No Loading States During Optimization
**Severity**: Medium  
**Impact**: Poor UX during long operations

**Current State**:
```typescript
const [isOptimizing, setIsOptimizing] = useState(false);
// Button shows spinner BUT:
// - No progress indication
// - No cancellation option
// - No estimated time
```

**Recommended**:
```typescript
{isOptimizing && (
  <Progress value={progress} className="mt-2" />
  <p className="text-sm text-muted-foreground">
    Iteration {currentIteration} of {maxIterations}...
  </p>
)}
```

#### 2.5 Ingredient Search UX Issues
**Severity**: Medium  
**Impact**: Difficult to find ingredients quickly

**Current Issues**:
```typescript
<Popover> // Line 633
  <PopoverTrigger>
    <Button variant="outline">
      {row.ingredient || "Search ingredient..."}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[400px] p-0 z-[100]">
    <SmartIngredientSearch ... />
  </PopoverContent>
</Popover>
```

**Problems**:
1. ❌ Button doesn't look like a search input
2. ❌ No keyboard shortcut to open search
3. ❌ Popover width fixed (400px) - may be too narrow
4. ❌ No recent ingredients / favorites
5. ❌ No ingredient categories visible

**Recommended**: Consider combobox pattern or dedicated search input

#### 2.6 No Visual Feedback for Locked Ingredients
**Severity**: Medium  
**Impact**: Users can't see which ingredients won't be adjusted

**Current State**: Locking happens silently in classification (Phase 1)

**Recommended**:
```typescript
<TableRow className={classification.isLocked ? 'opacity-60' : ''}>
  {classification.isLocked && (
    <Badge variant="outline" className="ml-2">
      <Lock className="h-3 w-3 mr-1" />
      Locked
    </Badge>
  )}
</TableRow>
```

#### 2.7 Balance Button Provides Minimal Feedback
**Severity**: Medium  
**Impact**: Users don't understand what happened

**Current Toast**:
```typescript
toast({
  title: `✅ Recipe Balanced (${result.strategy})`,
  description: (
    <div>
      <div>{result.message}</div>
      {result.adjustmentsSummary.slice(0, 3).map(...)}  // Only 3 shown!
    </div>
  )
});
```

**Problems**:
1. ⚠️ Toast disappears after 5 seconds
2. ⚠️ Only 3 adjustments shown (may be 10+ made)
3. ⚠️ No way to see full optimization log
4. ⚠️ No before/after comparison

**Recommended**: Add persistent optimization history panel

### 💡 MEDIUM Priority Issues

#### 2.8 No Tooltips Explaining Features
**Severity**: Low-Medium  
**Impact**: New users confused by terminology

**Missing Tooltips**:
- "Balance Recipe" button - what does it do?
- "PAC", "MSNF", "FPDT" - what do these mean?
- Product types - what's the difference?
- Column headers - why track these metrics?

**Recommended**: Add `<TooltipProvider>` and tooltips throughout

#### 2.9 No Undo/Redo Functionality
**Severity**: Low-Medium  
**Impact**: Can't revert unwanted changes

**Current**: After balancing, previous recipe is lost

**Recommended**: Store recipe history with undo button

#### 2.10 Calculation Happens on Every Input
**Severity**: Low-Medium  
**Impact**: May cause performance issues with large recipes

**Current**:
```typescript
const calculateMetrics = () => {
  // Runs calcMetricsV2 immediately
};

const updateRow = (index, field, value) => {
  // Updates state
  // No debouncing
};
```

**Recommended**: Debounce calculations or use "Calculate" button only

#### 2.11 No Batch Operations
**Severity**: Low  
**Impact**: Tedious to edit multiple ingredients

**Missing Features**:
- Scale entire recipe by percentage
- Delete all ingredients
- Duplicate ingredient
- Copy/paste between rows

#### 2.12 Poor Empty States
**Severity**: Low  
**Impact**: Unclear what to do when starting

**Current Empty State**: Shows template browser OR "Add Ingredient"

**Recommended**: Better onboarding with examples and guidance

---

## 3. Accessibility Issues

### 3.1 Missing ARIA Labels
**Severity**: Medium  
**Impact**: Screen readers can't navigate properly

**Missing**:
```typescript
// Ingredient search
<Button variant="outline">  // Needs aria-label
  <Search className="mr-2 h-4 w-4" />
</Button>

// Delete button
<Button variant="ghost" size="sm">  // Needs aria-label="Delete ingredient"
  <Trash2 className="h-4 w-4" />
</Button>
```

### 3.2 No Keyboard Navigation for Table
**Severity**: Medium  
**Impact**: Power users slowed down

**Missing**:
- Tab navigation between cells
- Arrow key navigation
- Enter to edit cell
- Escape to cancel edit

### 3.3 Low Color Contrast in Some Areas
**Severity**: Low  
**Impact**: Readability issues

**Check**:
- Muted text colors
- Badge backgrounds
- Disabled button states

---

## 4. Mobile Responsiveness Issues

### 4.1 Table Overflow
**Status**: ❌ Not handled  
**Recommendation**: Horizontal scroll OR card layout

### 4.2 Input Fields Too Small
**Status**: ⚠️ Default size  
**Recommendation**: Increase touch target size to 44x44px minimum

### 4.3 Popover Positioning
**Status**: ⚠️ May overflow screen  
**Recommendation**: Use adaptive positioning

### 4.4 Button Layout
**Status**: ⚠️ Wraps unpredictably  
**Recommendation**: Stack vertically on mobile

---

## 5. Data Validation Issues

### 5.1 No Input Validation
**Severity**: Medium  
**Impact**: Invalid data can crash calculator

**Current**:
```typescript
<Input
  type="number"
  value={row.quantity_g}
  onChange={(e) => updateRow(index, 'quantity_g', parseFloat(e.target.value) || 0)}
/>
```

**Problems**:
- ❌ No min/max constraints
- ❌ Negative values allowed
- ❌ NaN becomes 0 silently
- ❌ No validation feedback

**Recommended**: Add Zod schema validation

### 5.2 No Duplicate Ingredient Detection
**Severity**: Low  
**Impact**: Users may add same ingredient twice

**Recommended**: Warn when selecting duplicate

---

## 6. Performance Issues

### 6.1 No Virtualization for Long Lists
**Severity**: Low  
**Impact**: Slow with 50+ ingredients

**Recommended**: Use `react-window` for ingredient search

### 6.2 Excessive Re-renders
**Severity**: Low  
**Impact**: UI may feel sluggish

**Recommendation**: Use React.memo and useCallback more

---

## 7. Detailed UX Improvement Recommendations

### Priority 1: Critical Fixes (Do Immediately)

#### 7.1.1 Standardize Z-Index System
```typescript
// tailwind.config.ts
zIndex: {
  'base': '0',
  'dropdown': '50',
  'popover': '60',
  'dialog': '70',
  'toast': '80',
  'tooltip': '90'
}

// Remove all custom z-[100], z-[200] classes
// Use semantic names instead
```

#### 7.1.2 Add Mobile-Responsive Table
```typescript
// Use MobileIngredientRow pattern from existing code
const isMobile = useMediaQuery('(max-width: 768px)');

{isMobile ? (
  <div className="space-y-2">
    {rows.map((row, i) => (
      <MobileIngredientRow key={i} row={row} onUpdate={...} />
    ))}
  </div>
) : (
  <Table>...</Table>
)}
```

#### 7.1.3 Add Error Boundary
```typescript
<ErrorBoundary
  fallback={<CalculatorErrorFallback onReset={clearRecipe} />}
>
  <RecipeCalculatorV2 />
</ErrorBoundary>
```

### Priority 2: High-Value Enhancements

#### 7.2.1 Add Optimization History Panel
```typescript
<Card>
  <CardHeader>
    <CardTitle>Optimization History</CardTitle>
  </CardHeader>
  <CardContent>
    <OptimizationTimeline
      iterations={result.progress}
      strategy={result.strategy}
      adjustments={result.adjustmentsSummary}
    />
  </CardContent>
</Card>
```

#### 7.2.2 Expose Ingredient Classification to Users
```typescript
<Badge variant={classification.isLocked ? 'secondary' : 'outline'}>
  {classification.roles[0].role.replace('_', ' ')}
  {classification.isLocked && <Lock className="h-3 w-3 ml-1" />}
</Badge>

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>
      <Info className="h-4 w-4" />
    </TooltipTrigger>
    <TooltipContent>
      <p>Flexibility: {(classification.flexibility * 100).toFixed(0)}%</p>
      <p>Roles: {classification.roles.map(r => r.role).join(', ')}</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

#### 7.2.3 Add Before/After Comparison
```typescript
<RecipeCompareDialog
  original={originalMetrics}
  optimized={result.metrics}
  adjustments={result.adjustmentsSummary}
/>
```

#### 7.2.4 Add Progress Indicator for Optimization
```typescript
{isOptimizing && (
  <div className="space-y-2 mt-4">
    <div className="flex justify-between text-sm">
      <span>Optimizing recipe...</span>
      <span>{currentIteration}/{maxIterations}</span>
    </div>
    <Progress value={(currentIteration / maxIterations) * 100} />
    <p className="text-xs text-muted-foreground">
      {currentStrategy} - Score: {currentScore.toFixed(3)}
    </p>
  </div>
)}
```

### Priority 3: Nice-to-Have Features

#### 7.3.1 Add Ingredient Locking UI
```typescript
<Checkbox
  checked={row.locked}
  onCheckedChange={(checked) => updateRow(index, 'locked', checked)}
  aria-label="Lock this ingredient from optimization"
/>
```

#### 7.3.2 Add Recipe History/Undo
```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={undo}
  disabled={historyIndex === 0}
>
  <Undo className="h-4 w-4 mr-2" />
  Undo
</Button>
```

#### 7.3.3 Add Tooltips Everywhere
```typescript
<GlossaryTooltip term="MSNF">
  <span className="cursor-help border-b border-dotted">MSNF</span>
</GlossaryTooltip>
```

#### 7.3.4 Add Batch Operations
```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm">
      Batch Actions
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={scaleRecipe}>
      Scale Recipe...
    </DropdownMenuItem>
    <DropdownMenuItem onClick={clearAll}>
      Clear All
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## 8. Specific Code Improvements

### 8.1 Fix Dropdown Styling
```typescript
// BEFORE (inconsistent):
<SelectContent className="bg-popover z-[100]">

// AFTER (consistent):
<SelectContent className="bg-popover border shadow-md">
// Remove custom z-index, use base component's z-50
```

### 8.2 Improve Ingredient Search Popover
```typescript
// BEFORE:
<PopoverContent className="w-[400px] p-0 z-[100] bg-popover">

// AFTER:
<PopoverContent 
  className="w-full max-w-[400px] p-0 bg-popover border shadow-lg"
  align="start"
  sideOffset={8}
>
```

### 8.3 Add Input Validation
```typescript
// Add Zod schema:
const IngredientRowSchema = z.object({
  quantity_g: z.number().min(0).max(10000),
  sugars_g: z.number().min(0),
  fat_g: z.number().min(0),
  msnf_g: z.number().min(0),
  other_solids_g: z.number().min(0),
  total_solids_g: z.number().min(0)
});

// Validate on update:
const updateRow = (index, field, value) => {
  try {
    IngredientRowSchema.parse({ ...row, [field]: value });
    // Update state
  } catch (error) {
    toast({
      title: 'Invalid value',
      description: error.errors[0].message,
      variant: 'destructive'
    });
  }
};
```

### 8.4 Add Keyboard Shortcuts
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+Enter or Cmd+Enter to calculate
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      calculateMetrics();
    }
    // Ctrl+B or Cmd+B to balance
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      balanceRecipe();
    }
    // Ctrl+S or Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveRecipe();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## 9. Testing Recommendations

### 9.1 Manual Testing Checklist
- [ ] Test all dropdowns on different screen sizes
- [ ] Verify z-index stacking in all scenarios
- [ ] Test mobile responsiveness (< 768px width)
- [ ] Test with screen reader
- [ ] Test keyboard navigation
- [ ] Test with large recipes (50+ ingredients)
- [ ] Test optimization with infeasible targets
- [ ] Test validation panel with all product types

### 9.2 Automated Tests Needed
```typescript
// tests/RecipeCalculatorV2.accessibility.spec.ts
describe('Accessibility', () => {
  it('has proper ARIA labels on all interactive elements', () => {});
  it('is keyboard navigable', () => {});
  it('meets WCAG 2.1 AA contrast requirements', () => {});
});

// tests/RecipeCalculatorV2.responsive.spec.ts
describe('Responsive Design', () => {
  it('renders mobile layout on small screens', () => {});
  it('dropdowns fit on screen', () => {});
  it('touch targets are minimum 44x44px', () => {});
});
```

---

## 10. Implementation Priority Matrix

| Category | Issue | Priority | Effort | Impact | Score |
|----------|-------|----------|--------|--------|-------|
| **Critical** | Standardize z-index | P0 | Low | High | 🔥 |
| **Critical** | Mobile responsive table | P0 | Medium | High | 🔥 |
| **Critical** | Error boundary | P0 | Low | High | 🔥 |
| **High** | Optimization history | P1 | Medium | High | ⚡ |
| **High** | Ingredient locking UI | P1 | Low | Medium | ⚡ |
| **High** | Loading states | P1 | Low | Medium | ⚡ |
| **High** | Input validation | P1 | Medium | Medium | ⚡ |
| **Medium** | Tooltips | P2 | Low | Low | 💡 |
| **Medium** | Keyboard shortcuts | P2 | Low | Medium | 💡 |
| **Medium** | Before/after comparison | P2 | Medium | Medium | 💡 |
| **Low** | Undo/redo | P3 | High | Medium | ⭐ |
| **Low** | Batch operations | P3 | Medium | Low | ⭐ |
| **Low** | Virtualization | P3 | High | Low | ⭐ |

**Recommendation**: Tackle P0 issues immediately, then P1 in next sprint.

---

## 11. Conclusion

### Strengths 💪
- ✅ Advanced balancing engine is powerful and accurate
- ✅ Science validation panel provides excellent feedback
- ✅ Template system helps onboarding
- ✅ Smart ingredient search works well
- ✅ Database integration solid

### Weaknesses 🎯
- ⚠️ Advanced features hidden from users (Phases 1-2)
- ⚠️ Mobile experience poor
- ⚠️ Limited transparency into optimization decisions
- ⚠️ Inconsistent UI patterns
- ⚠️ Missing accessibility features

### Overall Assessment
The calculator has a **strong technical foundation** but needs **significant UX polish** to match the quality of the underlying engine. The balancing algorithm is sophisticated, but users can't see or control how it works.

### Recommended Next Steps
1. **Week 1**: Fix P0 issues (z-index, mobile, error boundary)
2. **Week 2**: Add optimization history and progress indicators
3. **Week 3**: Expose Phase 1-2 features to users with UI controls
4. **Week 4**: Polish with tooltips, keyboard shortcuts, and validation

**Estimated effort**: 2-4 weeks for full implementation of all recommendations.

---

**Report prepared by**: Lovable AI  
**Report version**: 1.0  
**Last updated**: 2025-11-08
