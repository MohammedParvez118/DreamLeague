# Quick API Reference - Playing XI Sequential System

## 🔗 Current API Endpoints (Latest)

### 1. Get Playing XI
```
GET /api/league/:leagueId/team/:teamId/match/:matchId/playing-xi
```
**Example:** `GET /api/league/1/team/1/match/842/playing-xi`

**Response:**
```json
{
  "success": true,
  "data": {
    "players": [...],          // Array of 11 players
    "canEdit": true,           // ✅ NEW - Form enabled?
    "errorMessage": null,      // ✅ NEW - Blocking message
    "transferStats": {
      "transfersUsed": 2,
      "transfersRemaining": 8,
      "transferLimit": 10
    },
    "previousMatchId": 842
  }
}
```

---

### 2. Save Playing XI
```
POST /api/league/:leagueId/team/:teamId/match/:matchId/playing-xi
```
**Example:** `POST /api/league/1/team/1/match/842/playing-xi`

**Request Body (Old Format - Still Works via Adapter):**
```json
{
  "players": [
    {
      "player_id": "1463374",
      "player_name": "Virat Kohli",
      "player_role": "Batsman",
      "squad_name": "India"
    }
    // ... 10 more (11 total)
  ],
  "captainId": "1463374",
  "viceCaptainId": "253802"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Playing XI saved successfully",
  "data": {
    "matchId": 842,
    "transfersUsed": 2,           // ✅ Adapter transforms
    "captainChangesUsed": 0,      // ✅ NEW
    "transfersRemaining": 8,
    "transferLimit": 10
  }
}
```

---

### 3. Check Match Lock Status
```
GET /api/league/:leagueId/match/:matchId/is-locked
```
**Example:** `GET /api/league/1/match/842/is-locked`

**Response:**
```json
{
  "success": true,
  "data": {
    "isLocked": false,
    "matchStart": "2025-12-02T14:30:00.000Z",
    "secondsUntilStart": 3024000,  // ✅ NEW - For countdown timer
    "isCompleted": false
  }
}
```

---

### 4. Get Matches With Status
```
GET /api/league/:leagueId/team/:teamId/matches-status
```
**Example:** `GET /api/league/1/team/1/matches-status`

**Response:**
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

---

### 5. Get Transfer Stats
```
GET /api/league/:leagueId/team/:teamId/transfer-stats
```
**Example:** `GET /api/league/1/team/1/transfer-stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "transfersUsed": 2,
    "transfersRemaining": 8,
    "transferLimit": 10,
    "captainFreeChangeUsed": false,
    "vcFreeChangeUsed": false
  }
}
```

---

### 6. Copy Playing XI (Legacy)
```
POST /api/league/:leagueId/team/:teamId/match/:toMatchId/copy-playing-xi
```
**Example:** `POST /api/league/1/team/1/match/844/copy-playing-xi`

**Request Body:**
```json
{
  "fromMatchId": 842
}
```

**Note:** Auto-save usually handles this automatically!

---

## 🚫 Removed Endpoints

### DELETE Playing XI ❌
```
DELETE /api/league/:leagueId/team/:teamId/match/:matchId/playing-xi
```
**Status:** REMOVED - Incompatible with sequential locking system

**Reason:** Rolling baseline requires previous lineups to exist

---

## 🆕 New Fields in Responses

| Field | Type | Where | Purpose |
|-------|------|-------|---------|
| `canEdit` | boolean | GET Playing XI | Frontend disables form if false |
| `errorMessage` | string\|null | GET Playing XI | Sequential blocking message |
| `secondsUntilStart` | number | Check Match Lock | Countdown timer calculation |
| `captainChangesUsed` | number | Save Playing XI | Track C/VC change costs |

---

## 🔄 Field Name Transformations (Adapter)

The adapter provides backward compatibility:

| Backend (New) | Frontend (Old) | Notes |
|--------------|----------------|-------|
| `lineup` | `players` | Adapter transforms automatically |
| `transfersThisMatch` | `transfersUsed` | Adapter transforms automatically |
| Both formats work! | Seamless compatibility | No frontend changes required |

---

## 📋 Quick Test Sequence

```bash
# 1. Check match lock status
GET /api/league/1/match/842/is-locked

# 2. Get Playing XI (will be empty or auto-prefilled)
GET /api/league/1/team/1/match/842/playing-xi

# 3. Save Playing XI
POST /api/league/1/team/1/match/842/playing-xi
# Body: { players: [...11 players], captainId: "...", viceCaptainId: "..." }

# 4. Get transfer stats
GET /api/league/1/team/1/transfer-stats

# 5. Get all matches with status
GET /api/league/1/team/1/matches-status

# 6. Next match - sequential blocking test
GET /api/league/1/team/1/match/844/playing-xi
# Check canEdit field and errorMessage
```

---

## 🎯 Sequential Locking Behavior

### Match N+1 Before Match N Deadline:
```json
{
  "canEdit": false,
  "errorMessage": "Cannot save Playing XI - previous match must be locked first. Wait until 12/2/2025, 2:30:00 PM"
}
```
**Frontend:** Disables form, shows yellow warning

### Match N+1 After Match N Deadline:
```json
{
  "canEdit": true,
  "errorMessage": null,
  "players": [...11 players auto-copied from Match N]
}
```
**Frontend:** Enables form, shows auto-prefilled lineup

---

## 🔧 Common Request/Response Patterns

### Pattern 1: Empty Lineup (First Access)
```json
{
  "players": [],
  "canEdit": true,
  "errorMessage": null,
  "previousMatchId": null
}
```

### Pattern 2: Auto-Prefilled Lineup
```json
{
  "players": [...11 players],
  "canEdit": true,
  "errorMessage": null,
  "previousMatchId": 842
}
```

### Pattern 3: Sequential Blocked
```json
{
  "players": [],
  "canEdit": false,
  "errorMessage": "Cannot save Playing XI - previous match must be locked first. Wait until 12/2/2025, 2:30:00 PM"
}
```

### Pattern 4: Match Locked
```json
{
  "players": [...11 players],
  "match": {
    "isLocked": true,
    "isCompleted": false
  }
}
```

---

## 💡 Pro Tips

1. **Check `canEdit` first** - Determines if form should be enabled
2. **Use `secondsUntilStart`** - For countdown timer display
3. **Check `errorMessage`** - Shows helpful blocking reasons
4. **Auto-save is automatic** - Just access the match, it prefills
5. **DELETE is gone** - Don't test it, it's intentionally removed
6. **League ID is required** - All routes need it in URL path

---

## 🐛 Error Responses

### Sequential Access Blocked (Not an Error!)
```json
{
  "success": true,
  "data": {
    "canEdit": false,
    "errorMessage": "..."
  }
}
```
**Note:** Still `success: true`, just can't edit yet

### Match Not Found
```json
{
  "success": false,
  "error": "Match not found"
}
```

### Transfer Limit Exceeded
```json
{
  "success": false,
  "error": "Transfer limit exceeded. You have 7 transfers remaining, but this change would use 11 transfers.",
  "details": {
    "transferLimit": 10,
    "transfersUsedBefore": 3,
    "transfersThisMatch": 11,
    "transfersRemaining": 7
  }
}
```

### Invalid Lineup
```json
{
  "success": false,
  "error": "Exactly 11 players required"
}
```

### Missing Captain/VC
```json
{
  "success": false,
  "error": "Captain and Vice-Captain required"
}
```

---

## 📊 Database Verification Queries

```sql
-- Check saved lineups
SELECT match_id, COUNT(*) as player_count 
FROM team_playing_xi 
WHERE team_id = 1 
GROUP BY match_id 
ORDER BY match_id;

-- Check free changes used
SELECT captain_free_change_used, vice_captain_free_change_used 
FROM fantasy_teams 
WHERE id = 1;

-- Check league transfer limit
SELECT transfer_limit 
FROM fantasy_leagues 
WHERE id = 1;

-- Verify league_id exists in all records
SELECT COUNT(*) 
FROM team_playing_xi 
WHERE league_id IS NULL;
-- Should return: 0
```

---

## ✅ Latest Fixes Applied

1. ✅ **League ID Fix** - Included in all INSERT statements
2. ✅ **DELETE Removed** - Endpoint completely removed
3. ✅ **Deadline Timer** - `secondsUntilStart` now calculated
4. ✅ **Sequential UI** - `canEdit` and `errorMessage` fields added
5. ✅ **Adapter Compatibility** - Old request formats still work

---

**Last Updated:** October 2025  
**Version:** 2.0 (Sequential System with all fixes)
