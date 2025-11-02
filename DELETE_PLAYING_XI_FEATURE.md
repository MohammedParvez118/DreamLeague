# 🗑️ Delete Playing XI Feature

## Date: October 25, 2025

## Problem Identified
Users received error: **"Cannot edit this match. You have already set Playing XI for future matches. Please delete future lineups first."**

But there was **no way to delete** the future lineups! 😅

---

## Solution: Delete Playing XI Feature

### What We Added

1. **Backend Endpoint** (`DELETE /api/league/:leagueId/team/:teamId/match/:matchId/playing-xi`)
2. **Frontend API Method** (`playingXIAPI.deletePlayingXI()`)
3. **Delete Button UI** (Red button next to Save button)
4. **Deadline Protection** (Cannot delete after match starts)

---

## How It Works

### Backend Logic (`playingXiController.js`)

```javascript
export const deletePlayingXI = async (req, res) => {
  // 1. Check if match exists
  // 2. Check deadline - BLOCK if passed
  // 3. Check if XI exists
  // 4. Delete Playing XI (transaction)
  // 5. Delete transfer logs for that match
};
```

### Key Features

#### ✅ **Deadline Protection**
```javascript
if (new Date() >= new Date(match.match_start)) {
  return res.status(403).json({
    message: 'Deadline passed. Cannot delete Playing XI after match starts'
  });
}
```

#### ✅ **Cascade Delete**
```sql
-- Delete Playing XI
DELETE FROM team_playing_xi 
WHERE team_id = $1 AND match_id = $2;

-- Also delete transfer logs
DELETE FROM playing_xi_transfers 
WHERE team_id = $1 AND match_id = $2;
```

#### ✅ **Confirmation Dialog**
```javascript
if (!window.confirm('Are you sure you want to delete the Playing XI for this match?')) {
  return;
}
```

---

## User Flow

### Scenario: Edit Past Match with Future Lineups

```
Step 1: User tries to edit Match 2
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Match 1 │  │ Match 2 │  │ Match 3 │
│ [LOCKED]│  │ [EDIT ❌]│  │ [SAVED] │
└─────────┘  └─────────┘  └─────────┘
                ↓
Error: "Cannot edit this match. Future lineups exist."

Step 2: Go to Match 3, click "Delete XI" button
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Match 1 │  │ Match 2 │  │ Match 3 │
│ [LOCKED]│  │         │  │ [DELETE]│ ← Click here
└─────────┘  └─────────┘  └─────────┘
                              ↓
Confirmation: "Are you sure? This cannot be undone."
User clicks: Yes

Step 3: Match 3 XI deleted, now can edit Match 2
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Match 1 │  │ Match 2 │  │ Match 3 │
│ [LOCKED]│  │ [EDIT ✅]│  │ [EMPTY] │
└─────────┘  └─────────┘  └─────────┘
                ↓
User edits Match 2: P3→P12 (1 transfer)

Step 4: Recreate Match 3 lineup
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Match 1 │  │ Match 2 │  │ Match 3 │
│ [LOCKED]│  │ P1-P2,  │  │ [CREATE]│
│         │  │ P4-P11, │  │         │
│         │  │ P12     │  │         │
└─────────┘  └─────────┘  └─────────┘
```

---

## UI Design

### Delete Button Appearance

```jsx
<button 
  onClick={handleDelete}
  className="btn-danger btn-delete-xi"
  disabled={saving}
>
  🗑️ Delete XI
</button>
```

### CSS Styling
```css
.btn-delete-xi {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  color: #fff;
  padding: 14px 32px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
}

.btn-delete-xi:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(244, 67, 54, 0.4);
}
```

### Button Visibility Logic
```javascript
// Only show if:
// 1. Match deadline hasn't passed (!matchLockStatus?.isLocked)
// 2. Playing XI exists (playingXI.length > 0)

{!matchLockStatus?.isLocked && playingXI.length > 0 && (
  <button onClick={handleDelete}>🗑️ Delete XI</button>
)}
```

---

## API Reference

### Endpoint
```
DELETE /api/league/:leagueId/team/:teamId/match/:matchId/playing-xi
```

### Request
```javascript
playingXIAPI.deletePlayingXI(leagueId, teamId, matchId)
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Playing XI deleted successfully",
  "data": {
    "teamId": 123,
    "matchId": 456
  }
}
```

### Error Responses

#### 403 - Deadline Passed
```json
{
  "success": false,
  "message": "Deadline passed. Cannot delete Playing XI after match starts"
}
```

#### 403 - Match Completed
```json
{
  "success": false,
  "message": "Match already completed. Cannot delete Playing XI"
}
```

#### 404 - No XI Found
```json
{
  "success": false,
  "message": "No Playing XI found for this match"
}
```

---

## Security & Safety

### ✅ **Protections in Place**

1. **Deadline Check**: Cannot delete after match starts
2. **Confirmation Dialog**: User must confirm before deletion
3. **Transaction**: Database operations are atomic (all or nothing)
4. **Cascade Delete**: Transfer logs also removed (data consistency)
5. **Match Ownership**: Only team owner can delete their XI

### ⚠️ **Important Notes**

- **Deletion is permanent** - Cannot be undone
- **Transfer counts reset** - Deleting recalculates baselines
- **Future matches affected** - Baseline changes if locked match deleted

---

## Frontend Behavior

### After Successful Delete

1. **Success Message**: "Playing XI deleted successfully"
2. **Form Reset**: 
   - `selectedPlayers = []`
   - `captain = null`
   - `viceCaptain = null`
3. **Refresh Matches List**: Updates match status indicators
4. **Auto-clear Message**: Success message disappears after 3 seconds

### Error Handling

```javascript
try {
  await playingXIAPI.deletePlayingXI(leagueId, teamId, matchId);
  setSuccess('Playing XI deleted successfully');
  // Reset form...
} catch (err) {
  setError(err.response?.data?.message || 'Failed to delete playing XI');
  setTimeout(() => setError(null), 5000);
}
```

---

## Database Impact

### Tables Modified

#### `team_playing_xi`
```sql
DELETE FROM team_playing_xi 
WHERE team_id = ? AND match_id = ?;

-- Removes 11 rows (one per player)
```

#### `playing_xi_transfers`
```sql
DELETE FROM playing_xi_transfers 
WHERE team_id = ? AND match_id = ?;

-- Removes all transfer audit logs for that match
```

### Why Delete Transfer Logs?

**Reason**: Transfer logs are tied to specific match saves. If the save is deleted, the logs become orphaned and misleading.

**Example**:
```
Before Delete:
Match 2: P1-P11 [Saved]
Logs: P3→P12 (1 transfer)

After Delete:
Match 2: [No XI]
Logs: [DELETED] ← Prevents confusion
```

---

## Testing Checklist

### ✅ Test Case 1: Normal Delete
- [ ] Match 3 has saved XI
- [ ] Deadline not passed
- [ ] Click Delete
- [ ] Confirm dialog
- [ ] XI successfully deleted
- [ ] Form resets

### ✅ Test Case 2: Deadline Passed
- [ ] Match 3 deadline passed
- [ ] Delete button NOT visible
- [ ] Direct API call returns 403

### ✅ Test Case 3: No XI Exists
- [ ] Match 3 has no saved XI
- [ ] Delete button NOT visible
- [ ] Direct API call returns 404

### ✅ Test Case 4: Enable Past Edit
- [ ] Match 2 has XI, Match 3 has XI
- [ ] Try edit Match 2 → Blocked
- [ ] Delete Match 3 XI
- [ ] Try edit Match 2 → Success!

### ✅ Test Case 5: Cancel Confirmation
- [ ] Click Delete
- [ ] Click "Cancel" on confirmation
- [ ] XI still exists
- [ ] No API call made

---

## Integration with Retroactive Edit Prevention

### How They Work Together

```
User wants to edit Match 2:

1. Check: Does Match 3 have saved XI?
   └─ YES → Block edit with message:
      "Cannot edit. Delete Match 3 XI first."

2. User goes to Match 3
   └─ Sees "Delete XI" button (if not locked)

3. User clicks Delete
   └─ Confirmation: "Are you sure?"

4. User confirms
   └─ DELETE /api/.../match/3/playing-xi
   └─ Success: "Playing XI deleted"

5. User returns to Match 2
   └─ No future XI found
   └─ Edit now ALLOWED ✅
```

---

## Common User Questions

### Q: Why can't I see the Delete button?
**A:** The button only appears if:
- Match deadline hasn't passed
- You have a saved Playing XI for that match

### Q: Can I delete a locked match?
**A:** No. Once the deadline passes, the lineup is permanent.

### Q: What happens to my transfers if I delete?
**A:** Transfer logs for that specific match are deleted. Your overall transfer count adjusts based on remaining matches.

### Q: Can I undo a deletion?
**A:** No. Deletion is permanent. You'll need to recreate the lineup.

### Q: Do I need to delete ALL future matches?
**A:** No. You only need to delete the **immediately next** match. For example:
- To edit Match 2: Delete Match 3
- To edit Match 3: Delete Match 4
- etc.

---

## Code Files Modified

### Backend
1. **`src/controllers/api/playingXiController.js`** - Added `deletePlayingXI()` function
2. **`src/routes/api/playingXI.js`** - Added DELETE route

### Frontend
1. **`client/src/services/api.js`** - Added `deletePlayingXI()` method
2. **`client/src/components/PlayingXIForm.jsx`** - Added `handleDelete()` and Delete button
3. **`client/src/components/PlayingXIForm.css`** - Added `.btn-delete-xi` styles

---

## Summary

**Problem**: Users blocked from editing past matches but no way to delete future ones

**Solution**: Added Delete Playing XI feature with:
- ✅ Deadline protection (can't delete after match starts)
- ✅ Confirmation dialog (prevent accidental deletion)
- ✅ Cascade delete (removes transfer logs too)
- ✅ Clear UI (red button with trash icon)
- ✅ Success feedback (message + form reset)

**Result**: Users can now resolve "future lineups exist" errors by deleting future matches before editing past ones! 🎉
