# Postman Collection Update Guide

## 🔄 API Endpoint Changes

The Postman collection needs URL updates to match the new route structure. Here's what changed:

### Old Routes (Before)
```
GET    /api/playing-xi/:teamId/:matchId
POST   /api/playing-xi
DELETE /api/playing-xi/:teamId/:matchId
GET    /api/transfer-stats/:teamId
```

### New Routes (Current)
```
GET    /api/league/:leagueId/team/:teamId/match/:matchId/playing-xi
POST   /api/league/:leagueId/team/:teamId/match/:matchId/playing-xi
❌     DELETE REMOVED (incompatible with sequential system)
GET    /api/league/:leagueId/team/:teamId/transfer-stats
GET    /api/league/:leagueId/match/:matchId/is-locked
GET    /api/league/:leagueId/team/:teamId/matches-status
```

---

## ✏️ Quick Manual Updates

Since the collection file is large, here's the fastest way to update it:

### Option 1: Find & Replace in Postman
1. Open collection in Postman
2. For each request, update URLs:

**GET Playing XI:**
- Old: `{{base_url}}/api/playing-xi/{{team_id}}/{{match_842}}`
- New: `{{base_url}}/api/league/{{league_id}}/team/{{team_id}}/match/{{match_842}}/playing-xi`

**POST Playing XI:**
- Old: `{{base_url}}/api/playing-xi`
- New: `{{base_url}}/api/league/{{league_id}}/team/{{team_id}}/match/{{match_842}}/playing-xi`
- **Important:** Change `matchId` variable in URL path instead of body

**Transfer Stats:**
- Old: `{{base_url}}/api/transfer-stats/{{team_id}}`
- New: `{{base_url}}/api/league/{{league_id}}/team/{{team_id}}/transfer-stats`

### Option 2: Update Request Body Format

The adapter handles backward compatibility, but for clarity:

**Old Body Format (Still Works via Adapter):**
```json
{
  "teamId": 1,
  "matchId": 842,
  "leagueId": 1,
  "squad": [...],
  "captain": "1463374",
  "viceCaptain": "253802"
}
```

**New Format (Direct to Controller):**
```json
{
  "players": [
    {
      "player_id": "1463374",
      "player_name": "Virat Kohli",
      "player_role": "Batsman",
      "squad_name": "India"
    },
    // ... 10 more
  ],
  "captainId": "1463374",
  "viceCaptainId": "253802"
}
```

**Note:** Adapter automatically transforms old format to new, so both work!

---

## 🆕 New Tests to Add

### 1. Check Match Lock Status (New Endpoint)
```
GET {{base_url}}/api/league/{{league_id}}/match/{{match_842}}/is-locked
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "isLocked": false,
    "matchStart": "2025-12-02T14:30:00.000Z",
    "secondsUntilStart": 3024000,
    "isCompleted": false
  }
}
```

**Purpose:** Test deadline timer fix (secondsUntilStart)

### 2. Get Matches With Status (New Endpoint)
```
GET {{base_url}}/api/league/{{league_id}}/team/{{team_id}}/matches-status
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "match_id": 842,
        "match_description": "India vs Australia",
        "match_start": "2025-12-02T14:30:00.000Z",
        "is_locked": false,
        "is_completed": false,
        "has_playing_xi": true
      }
    ]
  }
}
```

**Purpose:** Test UI match list with lock/save status

### 3. Sequential Blocking Test (Updated)
```
GET {{base_url}}/api/league/{{league_id}}/team/{{team_id}}/match/{{match_844}}/playing-xi
```

**Before Match 842 deadline - Expected Response:**
```json
{
  "success": true,
  "data": {
    "players": [],
    "canEdit": false,
    "errorMessage": "Cannot save Playing XI - previous match must be locked first. Wait until 12/2/2025, 2:30:00 PM"
  }
}
```

**Purpose:** Test that backend provides blocking info (frontend disables form)

---

## 🗑️ Tests to Remove

### DELETE Section (Section 7)
Remove these tests completely:
- ❌ "Delete Playing XI for Unlocked Match"
- ❌ "Try to Delete Locked Match"

**Reason:** DELETE endpoint removed from system. Sequential locking requires all previous lineups to exist.

---

## ✅ Response Field Changes to Expect

### GET Playing XI Response
**Old:**
```json
{
  "lineup": [...],
  "transferStats": {...}
}
```

**New (Adapter transforms to this):**
```json
{
  "players": [...],        // ✅ lineup → players
  "canEdit": true,          // ✅ NEW FIELD
  "errorMessage": null,     // ✅ NEW FIELD
  "transferStats": {...}
}
```

### POST Playing XI Response
**Old:**
```json
{
  "transfersThisMatch": 2
}
```

**New (Adapter transforms to this):**
```json
{
  "transfersUsed": 2,       // ✅ transfersThisMatch → transfersUsed
  "captainChangesUsed": 0   // ✅ NEW FIELD
}
```

---

## 🧪 Updated Test Sequence

1. **Setup & Verification**
   - ✅ Check League Transfer Limit
   - ✅ Check Team Free Changes Status
   - ✅ Get Transfer Stats (Initial)
   - ✅ **NEW:** Check Match Lock Status

2. **Match 842 - First Match**
   - ✅ Get Playing XI (Empty)
   - ✅ Save Playing XI (0 transfers)
   - ✅ **NEW:** Get Matches With Status

3. **Match 844 - Sequential Blocking Test**
   - ✅ **NEW:** Get Playing XI (Before Match 842 locks - should show canEdit: false)
   - ✅ Check Match Lock Status for Match 842
   - ✅ Get Playing XI (After Match 842 locks - auto-prefilled)
   - ✅ Save with 2 player transfers
   - ✅ Get Transfer Stats (2 used, 8 remaining)

4. **Match 846 - Free Captain Change**
   - ✅ Get Playing XI (Auto-prefilled from 844)
   - ✅ Save with Captain Change (0 transfers - free)
   - ✅ Get Transfer Stats (still 2 used)

5. **Match 848 - Paid Captain Change**
   - ✅ Get Playing XI
   - ✅ Save with Captain Change (1 transfer - costs)
   - ✅ Get Transfer Stats (3 used, 7 remaining)

6. **Edge Cases**
   - ✅ Try to exceed transfer limit
   - ✅ Save without captain
   - ✅ Save with < 11 players
   - ❌ **REMOVE:** DELETE tests

7. **Rolling Baseline Test**
   - ✅ Re-add player from Match 842 in Match 850 (still costs transfer)

---

## 📋 Quick Update Checklist

- [ ] Update GET Playing XI URLs (add league_id path)
- [ ] Update POST Playing XI URLs (add league_id, team_id, match_id in path)
- [ ] Update Transfer Stats URL (add league_id path)
- [ ] Add "Check Match Lock Status" test
- [ ] Add "Get Matches With Status" test
- [ ] Add "Sequential Blocking" test (check canEdit field)
- [ ] Remove entire "Delete & Cleanup" section
- [ ] Update expected response fields (lineup→players, transfersThisMatch→transfersUsed)
- [ ] Add canEdit and errorMessage checks in assertions

---

## 🚀 Alternative: Use the Updated Guide

Instead of updating the old collection, you can test using the **POSTMAN_TESTING_GUIDE.md** which has all the latest endpoints and expected responses.

The guide includes:
- ✅ Correct API endpoints with league_id
- ✅ Expected responses with new fields
- ✅ Sequential blocking tests
- ✅ Deadline timer verification
- ✅ No DELETE tests
- ✅ Troubleshooting for latest fixes

---

## 🔧 Common Issues After Update

### Issue: "Cannot find route"
- Ensure you added `/league/:leagueId` prefix to all routes
- Check `{{league_id}}` variable is set in collection

### Issue: "league_id is null"
- Verify `league_id` is in the URL path, not just request body
- Example: `/api/league/1/team/1/match/842/playing-xi`

### Issue: Response has "lineup" instead of "players"
- This is OK! Adapter transforms `lineup → players`
- Old collections expecting "lineup" will still work

### Issue: DELETE returns 404
- Expected! DELETE endpoint was removed
- Remove these tests from your collection

---

## 📝 Summary

**What Changed:**
1. All routes now include `/league/:leagueId` prefix
2. POST route includes full path with match_id (not just body)
3. DELETE endpoint removed entirely
4. New response fields: `canEdit`, `errorMessage`, `secondsUntilStart`
5. Adapter provides backward compatibility for old formats

**Action Required:**
- Update all request URLs to include league_id in path
- Remove DELETE tests
- Add new tests for match lock status and sequential blocking
- Update assertions to check for new fields

**Testing Priority:**
1. ✅ Sequential blocking (canEdit field)
2. ✅ Auto-save mechanism
3. ✅ Deadline timer (secondsUntilStart)
4. ✅ Transfer counting with rolling baseline
5. ✅ Captain/VC free changes
