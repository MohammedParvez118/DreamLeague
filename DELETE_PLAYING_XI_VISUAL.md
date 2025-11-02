# 🗑️ Delete Playing XI - Visual Guide

## UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Playing XI Selection - Match 3                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⏰ Deadline: 2h 30m                🔄 Transfers: 5/10     │
│                                                             │
│  [Player Selection Grid...]                                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [💾 Save Playing XI]  [🗑️ Delete XI]  ← New button!      │
│        Green                Red                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Button States

### State 1: No XI Saved
```
┌──────────────────────────┐
│ [💾 Save Playing XI]     │ ← Only Save visible
│   (Disabled if < 11)     │
└──────────────────────────┘
```

### State 2: XI Saved (Before Deadline)
```
┌─────────────────────────────────────────┐
│ [💾 Save Playing XI]  [🗑️ Delete XI]   │ ← Both visible
│      (Active)              (Active)      │
└─────────────────────────────────────────┘
```

### State 3: Deadline Passed
```
┌──────────────────────────┐
│ 🔒 Match Locked          │ ← No buttons
│    Cannot edit           │
└──────────────────────────┘
```

---

## Delete Flow Diagram

```
User clicks "Delete XI" button
           ↓
┌──────────────────────────────────────┐
│ ⚠️ Confirmation Dialog               │
│                                      │
│ Are you sure you want to delete     │
│ the Playing XI for this match?      │
│ This action cannot be undone.       │
│                                      │
│  [Cancel]  [Yes, Delete]            │
└──────────────────────────────────────┘
           ↓
    User clicks "Cancel"
           ↓
┌──────────────────────────────────────┐
│ Nothing happens                      │
│ XI still saved                       │
└──────────────────────────────────────┘

           OR
           
    User clicks "Yes, Delete"
           ↓
┌──────────────────────────────────────┐
│ Backend Processing...                │
│ - Check deadline                     │
│ - Delete team_playing_xi rows        │
│ - Delete playing_xi_transfers        │
│ - Commit transaction                 │
└──────────────────────────────────────┘
           ↓
┌──────────────────────────────────────┐
│ ✅ Success Message                   │
│ "Playing XI deleted successfully"    │
│                                      │
│ Form Reset:                          │
│ - Selected players cleared           │
│ - Captain cleared                    │
│ - Vice-Captain cleared               │
│ - Match list refreshed               │
└──────────────────────────────────────┘
```

---

## Error Scenarios

### Error 1: Deadline Passed
```
User clicks "Delete XI"
           ↓
┌──────────────────────────────────────┐
│ ❌ Error                             │
│                                      │
│ Deadline passed. Cannot delete       │
│ Playing XI after match starts.       │
│                                      │
│  [OK]                                │
└──────────────────────────────────────┘
```

### Error 2: Match Completed
```
User clicks "Delete XI"
           ↓
┌──────────────────────────────────────┐
│ ❌ Error                             │
│                                      │
│ Match already completed. Cannot      │
│ delete Playing XI.                   │
│                                      │
│  [OK]                                │
└──────────────────────────────────────┘
```

### Error 3: No XI Found
```
User tries API call directly
           ↓
┌──────────────────────────────────────┐
│ ❌ Error                             │
│                                      │
│ No Playing XI found for this match.  │
│                                      │
│  [OK]                                │
└──────────────────────────────────────┘
```

---

## Integration with Edit Prevention

### Scenario: Edit Past Match

```
Timeline View:
┌─────────┬─────────┬─────────┬─────────┐
│ Match 1 │ Match 2 │ Match 3 │ Match 4 │
│ [LOCKED]│ [SAVED] │ [SAVED] │ [EMPTY] │
└─────────┴─────────┴─────────┴─────────┘

Step 1: Try to edit Match 2
           ↓
┌──────────────────────────────────────────┐
│ ❌ Cannot Edit Match                     │
│                                          │
│ You have already set Playing XI for     │
│ Match 3.                                 │
│                                          │
│ To edit this match:                      │
│ 1. Delete lineups for Match 3 onwards   │
│ 2. Edit Match 2                          │
│ 3. Recreate future lineups              │
│                                          │
│  [Understand]  [Go to Match 3]          │
└──────────────────────────────────────────┘

Step 2: Go to Match 3
           ↓
┌─────────────────────────────────────────────────┐
│ Playing XI Selection - Match 3                  │
│                                                 │
│ [Player selection showing saved lineup...]      │
│                                                 │
│ [💾 Save Playing XI]  [🗑️ Delete XI]  ← Click │
└─────────────────────────────────────────────────┘

Step 3: Click Delete → Confirm
           ↓
┌─────────────────────────────────────────────────┐
│ ✅ Playing XI deleted successfully              │
│                                                 │
│ [Form now empty - no players selected]          │
│                                                 │
│ [💾 Save Playing XI]  ← Only Save button now   │
│     (Disabled)                                  │
└─────────────────────────────────────────────────┘

Step 4: Return to Match 2
           ↓
┌─────────────────────────────────────────────────┐
│ Playing XI Selection - Match 2                  │
│                                                 │
│ [Player selection showing saved lineup...]      │
│                                                 │
│ [💾 Save Playing XI]  [🗑️ Delete XI]           │
│                                                 │
│ ✅ Edit now ALLOWED! (No future saves)         │
└─────────────────────────────────────────────────┘
```

---

## Database State Changes

### Before Delete
```sql
-- team_playing_xi
team_id | match_id | player_id | is_captain | is_vice_captain
--------|----------|-----------|------------|----------------
   123  |    3     |   1001    |   true     |     false
   123  |    3     |   1002    |   false    |     true
   123  |    3     |   1003    |   false    |     false
   ... (11 rows total)

-- playing_xi_transfers
team_id | match_id | transfer_type | player_id | previous_player_id
--------|----------|---------------|-----------|-------------------
   123  |    3     |  player_out   |   1005    |       NULL
   123  |    3     |  player_in    |   1012    |       NULL
```

### After Delete
```sql
-- team_playing_xi
(Empty - all 11 rows deleted)

-- playing_xi_transfers
(Empty - all transfer logs deleted)
```

---

## Button Styling Guide

### CSS Classes
```css
/* Delete Button - Red Theme */
.btn-delete-xi {
  /* Base State */
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  color: white;
  padding: 14px 32px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
}

/* Hover State */
.btn-delete-xi:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(244, 67, 54, 0.4);
  background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%);
}

/* Disabled State */
.btn-delete-xi:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Visual Appearance
```
Normal State:
┌─────────────────┐
│  🗑️ Delete XI   │  ← Red gradient background
└─────────────────┘    White text, subtle shadow

Hover State:
┌─────────────────┐
│  🗑️ Delete XI   │  ← Darker red, lifts up slightly
└─────────────────┘    Stronger shadow

Disabled State:
┌─────────────────┐
│  🗑️ Delete XI   │  ← Faded (50% opacity)
└─────────────────┘    Cannot click
```

---

## Match Status Indicators

### In Match List View
```
┌───────────────────────────────────────────────────┐
│ Your Matches                                      │
├───────────────────────────────────────────────────┤
│                                                   │
│ Match 1: Team A vs Team B                        │
│ 🔒 Locked | ✅ XI Saved                          │
│                                                   │
│ Match 2: Team C vs Team D                        │
│ ⏰ 5h 30m | ✅ XI Saved | [Edit] [🗑️ Delete]    │
│                                                   │
│ Match 3: Team E vs Team F                        │
│ ⏰ 2d 5h | ❌ No XI | [Set XI]                   │
│                                                   │
└───────────────────────────────────────────────────┘
```

---

## Confirmation Dialog Styling

```
┌─────────────────────────────────────────────────────┐
│ ⚠️  Confirm Deletion                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Are you sure you want to delete the Playing XI    │
│  for this match?                                    │
│                                                     │
│  ⚠️ This action cannot be undone.                  │
│                                                     │
│  Your saved lineup and transfer logs for this      │
│  match will be permanently deleted.                │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│         [Cancel]         [Yes, Delete]             │
│         Gray              Red                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Mobile Responsive Design

### Desktop (> 768px)
```
[💾 Save Playing XI]     [🗑️ Delete XI]
    Wide buttons          Side by side
```

### Mobile (< 768px)
```
[💾 Save Playing XI]
    Full width

[🗑️ Delete XI]
    Full width
```

### CSS Media Query
```css
@media (max-width: 768px) {
  .xi-actions {
    flex-direction: column;
  }
  
  .btn-save-xi,
  .btn-delete-xi {
    width: 100%;
  }
}
```

---

## Summary

### Button Placement
```
Footer of Playing XI Form
├─ Left: Save Playing XI (Green)
└─ Right: Delete XI (Red)
```

### Visibility Rules
```
Delete Button Shows When:
✅ Playing XI exists (playingXI.length > 0)
✅ Match not locked (!matchLockStatus?.isLocked)
✅ Match not completed (!matchLockStatus?.isCompleted)

Delete Button Hidden When:
❌ No Playing XI saved
❌ Deadline has passed
❌ Match is completed
```

### Safety Features
```
1. Confirmation Dialog (browser native)
2. Deadline check (backend)
3. Transaction safety (database)
4. Clear error messages (frontend)
5. Success feedback (visual + message)
```

**Result**: Users now have a clear, safe way to delete future lineups and enable editing of past matches! 🎉
