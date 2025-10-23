# Bug Fix: Integer Column Type Error

## Problem
The database was rejecting progress updates with the error:
```
❌ Error calculating progress: NeonDbError: invalid input syntax for type integer: "48.5"
```

## Root Cause
The `progress_percentage` column in the `tracking` table is defined as `INTEGER`, but the code was trying to save decimal values like `48.5` (from `Math.round(progress * 10) / 10`).

## Solution
Changed the database updates to round progress to integers:

**Before:**
```typescript
SET progress_percentage = ${Math.round(initialProgress * 10) / 10}  // Returns 48.5
```

**After:**
```typescript
SET progress_percentage = ${Math.round(initialProgress)}  // Returns 49
```

## Impact
- ✅ Database updates now work correctly
- ✅ Progress is still smooth (updates every 15 seconds)
- ✅ API still returns decimal precision for UI display: `progress: Math.round(progress * 10) / 10`
- ✅ localStorage still stores decimal precision for better UX

## Files Changed
- `app/api/tracking/[trackingNumber]/route.ts` (lines 459 and 511)

## Testing
Try tracking a package again - the progress should now update without errors!
