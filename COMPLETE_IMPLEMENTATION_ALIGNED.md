# Complete Playing XI System - Aligned with Requirements

## ✅ Full Requirements Alignment

### 1. Objective ✅
- ✅ Limited transfers per league (configurable via `fantasy_leagues.transfer_limit`)
- ✅ Match deadlines enforced
- ✅ Sequential lineup progression
- ✅ Auto-prefill from last locked lineup WITH AUTO-SAVE
- ✅ Controlled transfer usage

### 2. Core Principles ✅
- ✅ Transfer limit defined at league creation
- ✅ Match deadlines lock Playing XI
- ✅ 11 players with C & VC selection
- ✅ Transfers counted only on changes from auto-prefilled lineup
- ✅ Sequential access (Match N+1 only after Match N locks)

### 3. Functional Flow ✅

#### 3.1 Match 1 (Initial Setup)
```
User Action: Select 11 players + C + VC
System: Saves lineup to database
Transfers: 0 (first match, no baseline)
On Deadline: Lineup locks, becomes baseline for Match 2
```

#### 3.2 Match 2+ (Subsequent Matches)

**3.2.1 Auto-prefill WITH AUTO-SAVE** ✅
```
Trigger: User opens Match 2 (after Match 1 deadline passed)

System Process:
1. Check: Match 1 locked? YES ✅
2. Fetch: Match 1 saved lineup
3. AUTO-SAVE: Copy Match 1 lineup → Match 2 database
4. Display: Show Match 2 with pre-filled lineup
5. User sees: "Lineup auto-copied from Match 1"

Result: Match 2 now has saved lineup (copy of Match 1)
        User can edit or keep as-is (0 transfers if unchanged)
```

**3.2.2 Editing & Saving** ✅
```
User changes 3 players:
- Remove: Player A, Player B, Player C
- Add: Player X, Player Y, Player Z

Transfer Calculation:
Compare Match 2 NEW lineup vs Match 2 AUTO-SAVED lineup
Changes: 3 removals + 3 additions = 3 transfers (net changes)

On Save:
- Delete auto-saved Match 2 lineup
- Insert new Match 2 lineup
- Deduct 3 transfers from total
- Update transfer stats
```

**3.2.3 Locking** ✅
```
At Match 2 Deadline:
- Lineup becomes read-only
- Transfers finalized
- Match 3 unlocks
- Match 3 auto-copies Match 2 lineup (with auto-save)
```

### 4. Transfer Calculation Rules ✅

| Rule | Implementation | Status |
|------|----------------|--------|
| Base Comparison | Match N vs Match N-1 (rolling) | ✅ |
| Add/Remove Players | Each = 1 transfer | ✅ |
| Re-adding Old Player | Still counts as 1 transfer | ✅ |
| No Change | 0 transfers | ✅ |
| Transfer Cap | Blocks when limit reached | ✅ |

### 5. Captain & Vice-Captain Rules ✅

| Rule | Implementation | Status |
|------|----------------|--------|
| Free Change | 1 free C + 1 free VC per tournament | ✅ |
| Additional Changes | Costs 1 transfer each | ✅ |
| Auto-Carry Forward | Included in auto-save | ✅ |

Tracked in: `fantasy_teams.captain_free_change_used`, `fantasy_teams.vice_captain_free_change_used`

### 6. Sequential Unlocking Logic ✅

```
STAGE 1: Before Match N Lock
├─ Match N: Editable ✅
└─ Match N+1: BLOCKED ❌

STAGE 2: Match N Deadline Passes
├─ Match N: LOCKS 🔒
└─ Match N+1: UNLOCKS 🔓

STAGE 3: User Opens Match N+1
├─ System checks: Match N has saved lineup?
│   ├─ YES: AUTO-COPY to Match N+1 ✅
│   └─ NO: Block access ❌ "Previous match has no lineup"
│
└─ Display: Pre-filled Match N+1 lineup

STAGE 4: User Edits (Optional)
├─ Keep as-is: 0 transfers ✅
├─ Change 3 players: 3 transfers ✅
└─ Save: Update database

STAGE 5: Match N+1 Deadline
└─ Locks, Match N+2 unlocks (repeat cycle)
```

---

## 9. API Design (Project Implementation)

### Current Endpoints

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/league/:leagueId/team/:teamId/match/:matchId/playing-xi` | GET | Get Playing XI with auto-save logic | ✅ |
| `/api/league/:leagueId/team/:teamId/match/:matchId/playing-xi` | POST | Save/update Playing XI | ✅ |
| `/api/league/:leagueId/team/:teamId/match/:matchId/playing-xi` | DELETE | Delete Playing XI | ✅ |
| `/api/league/:leagueId/match/:matchId/is-locked` | GET | Check if match is locked | ✅ |
| `/api/league/:leagueId/team/:teamId/matches-status` | GET | Get all matches with status | ✅ |
| `/api/league/:leagueId/team/:teamId/match/:matchId/copy-playing-xi` | POST | Copy from another match (legacy) | ✅ |
| `/api/league/:leagueId/team/:teamId/transfer-stats` | GET | Get transfer summary | ✅ |

### Detailed API Specifications

#### 1. GET Playing XI (with Auto-Save)

**Endpoint:** `GET /api/league/:leagueId/team/:teamId/match/:matchId/playing-xi`

**Process:**
1. Validate match exists and belongs to league
2. Check if match is locked (deadline passed)
3. If previous match exists:
   - Check if previous match is locked
   - If not locked: BLOCK access
   - If locked: Check if previous has saved lineup
     - If yes and current match empty: **AUTO-SAVE** previous lineup to current match
     - If no: BLOCK access (sequential flow broken)
4. Return lineup with metadata

**Response:**
```json
{
  "success": true,
  "data": {
    "players": [
      {
        "player_id": "123",
        "player_name": "Virat Kohli",
        "player_role": "Batsman",
        "squad_name": "Royal Challengers",
        "is_captain": true,
        "is_vice_captain": false,
        "autoPrefilled": true
      }
    ],
    "match": {
      "id": 456,
      "leagueId": 83,
      "startTime": "2025-10-27T15:00:00Z",
      "isCompleted": false,
      "isLocked": false
    },
    "canEdit": true,
    "errorMessage": null,
    "transferStats": {
      "transfersUsed": 3,
      "transfersRemaining": 7,
      "transferLimit": 10,
      "captainFreeChangeUsed": false,
      "vcFreeChangeUsed": true
    },
    "previousMatchId": 455
  }
}
```

**Auto-Save Behavior:**
- Triggered when: User opens Match N+1 for first time after Match N locks
- Action: Copies all 11 players from Match N → Match N+1 in database
- User sees: Pre-filled lineup with `autoPrefilled: true` flag
- Benefit: Ensures rolling baseline exists for transfer calculation

---

#### 2. POST Save Playing XI

**Endpoint:** `POST /api/league/:leagueId/team/:teamId/match/:matchId/playing-xi`

**Request Body:**
```json
{
  "players": [
    {
      "player_id": "123",
      "player_name": "Virat Kohli",
      "player_role": "Batsman",
      "squad_name": "Royal Challengers"
    }
  ],
  "captainId": "123",
  "viceCaptainId": "456"
}
```

**Validation:**
1. Exactly 11 players required
2. Captain & Vice-Captain required and different
3. Match not locked
4. Previous match locked (if exists)
5. Transfer limit not exceeded

**Transfer Calculation:**
1. Fetch previous match lineup (Match N-1)
2. Compare with current submission
3. Count player changes (adds/removes)
4. Check captain/vice-captain changes
5. Apply free changes if available
6. Total = player transfers + C changes + VC changes

**Response:**
```json
{
  "success": true,
  "message": "Playing XI saved successfully",
  "data": {
    "matchId": 456,
    "transfersThisMatch": 3,
    "transfersUsedTotal": 5,
    "transfersRemaining": 5,
    "transferLimit": 10,
    "transfersUsed": 3,
    "captainChangesUsed": 0,
    "details": {
      "playerTransfers": 3,
      "captainChangeCost": 0,
      "vcChangeCost": 0,
      "captainFreeChangeUsed": false,
      "vcFreeChangeUsed": false,
      "playersAdded": ["Player X", "Player Y"],
      "playersRemoved": ["Player A", "Player B"]
    }
  }
}
```

---

#### 3. DELETE Playing XI

**Endpoint:** `DELETE /api/league/:leagueId/team/:teamId/match/:matchId/playing-xi`

**Validation:**
- Match must not be locked

**Response:**
```json
{
  "success": true,
  "message": "Playing XI deleted successfully"
}
```

---

#### 4. GET Match Lock Status

**Endpoint:** `GET /api/league/:leagueId/match/:matchId/is-locked`

**Response:**
```json
{
  "success": true,
  "data": {
    "isLocked": true,
    "isCompleted": false,
    "matchStart": "2025-10-27T15:00:00Z"
  }
}
```

---

#### 5. GET Matches with Playing XI Status

**Endpoint:** `GET /api/league/:leagueId/team/:teamId/matches-status`

**Response:**
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "match_id": 123,
        "tournament_match_id": 456,
        "match_description": "MI vs CSK",
        "match_start": "2025-10-27T15:00:00Z",
        "is_completed": false,
        "is_active": true,
        "has_playing_xi": true,
        "is_locked": true
      }
    ]
  }
}
```

---

#### 6. GET Transfer Stats

**Endpoint:** `GET /api/league/:leagueId/team/:teamId/transfer-stats`

**Process:**
1. Get league transfer limit
2. Iterate through all saved matches
3. Calculate transfers for each match (compare with previous)
4. Sum total transfers used

**Response:**
```json
{
  "success": true,
  "data": {
    "transferLimit": 10,
    "transfersUsed": 5,
    "transfersRemaining": 5,
    "captainFreeChangeUsed": true,
    "vcFreeChangeUsed": false,
    "matchDetails": [
      {
        "matchId": 1,
        "transfersUsed": 0
      },
      {
        "matchId": 2,
        "transfersUsed": 3
      },
      {
        "matchId": 3,
        "transfersUsed": 2
      }
    ]
  }
}
```

---

## 📊 Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     MATCH 1 (First Match)                       │
└─────────────────────────────────────────────────────────────────┘
User: Selects 11 players + C + VC
System: POST /api/playing-xi → Saves to database
Database: team_playing_xi (11 rows for Match 1)
Transfers: 0 (no baseline)
Deadline: Passes → Match 1 LOCKS

┌─────────────────────────────────────────────────────────────────┐
│                     MATCH 2 (Sequential)                        │
└─────────────────────────────────────────────────────────────────┘
User: Opens Match 2
System: GET /api/playing-xi
  ├─ Check: Match 1 locked? YES ✅
  ├─ Check: Match 1 has lineup? YES ✅
  ├─ Check: Match 2 has lineup? NO ❌
  └─ AUTO-SAVE: Copy Match 1 → Match 2 (11 rows)
Display: Show Match 2 with pre-filled lineup
User: Changes 3 players
System: POST /api/playing-xi
  ├─ Compare: Match 2 NEW vs Match 2 AUTO-SAVED
  ├─ Calculate: 3 players changed = 3 transfers
  ├─ Update: Delete old Match 2, Insert new Match 2
  └─ Stats: Total transfers = 3
Deadline: Passes → Match 2 LOCKS

┌─────────────────────────────────────────────────────────────────┐
│                     MATCH 3 (Rolling)                           │
└─────────────────────────────────────────────────────────────────┘
User: Opens Match 3
System: GET /api/playing-xi
  └─ AUTO-SAVE: Copy Match 2 → Match 3
User: Changes 2 players + Captain
System: POST /api/playing-xi
  ├─ Compare: Match 3 NEW vs Match 3 AUTO-SAVED (=Match 2)
  ├─ Calculate: 2 players + 1 captain (free) = 2 transfers
  └─ Stats: Total transfers = 3 + 2 = 5
```

---

## 🎯 Key Features Implemented

### 1. Auto-Save on First Access ✅
- When user opens Match N+1 for first time
- System automatically saves Match N lineup to Match N+1
- Ensures rolling baseline always exists

### 2. Rolling Baseline ✅
- Match 2 baseline = Match 1
- Match 3 baseline = Match 2
- Match 4 baseline = Match 3
- NOT all compared to Match 1

### 3. Sequential Unlocking ✅
- Match N+1 locked until Match N deadline passes
- Clear error messages with timestamps

### 4. Transfer Tracking ✅
- Compares current vs previous match only
- Counts net changes (not gross)
- Tracks captain/VC free changes separately

### 5. Match Locking ✅
- Time-based (match_start timestamp)
- Read-only view after lock
- Prevents retroactive edits

---

## ✅ Requirement Checklist

- [x] Limited transfers per league (admin configurable)
- [x] Match deadlines enforce locks
- [x] Sequential progression (can't skip matches)
- [x] Auto-prefill from previous locked lineup
- [x] **Auto-save auto-prefilled lineup**
- [x] Transfers counted only on changes
- [x] Rolling baseline (not fixed to Match 1)
- [x] One free C change + one free VC change
- [x] Additional C/VC changes cost 1 transfer
- [x] Clear UI feedback (transfers used/remaining)
- [x] Error messages for blocked actions

**All requirements met!** ✅
