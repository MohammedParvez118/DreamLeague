# Sequential Unlocking Visual Guide

## 📅 Timeline Example

```
════════════════════════════════════════════════════════════════════
                    FANTASY LEAGUE TIMELINE
════════════════════════════════════════════════════════════════════

Oct 25, 10:00 AM          Oct 26, 10:00 AM          Oct 27, 10:00 AM
     ↓                         ↓                         ↓
 Match 1 Deadline          Match 2 Deadline          Match 3 Deadline
   [LOCKS]                   [LOCKS]                   [LOCKS]
     │                         │                         │
     └─────────────────────────┴─────────────────────────┘
           Match 1 XI              Match 2 XI              Match 3 XI
          Editable Until          Editable Until          Editable Until
          Oct 25 10:00AM         Oct 26 10:00AM         Oct 27 10:00AM
```

---

## 🔐 Access Control Matrix

### Current Time: Oct 25, 09:00 AM (Before any matches)

| Match | Status | Can Access? | Can Edit? | Auto-Prefill From |
|-------|--------|-------------|-----------|-------------------|
| Match 1 | 🟢 OPEN | ✅ YES | ✅ YES | None (first match) |
| Match 2 | 🔒 BLOCKED | ❌ NO | ❌ NO | N/A (locked out) |
| Match 3 | 🔒 BLOCKED | ❌ NO | ❌ NO | N/A (locked out) |

**Error if trying Match 2:**  
`"Cannot access this match yet. Previous match must be locked first. Wait until Oct 25, 10:00 AM"`

---

### Current Time: Oct 25, 10:01 AM (Match 1 just locked)

| Match | Status | Can Access? | Can Edit? | Auto-Prefill From |
|-------|--------|-------------|-----------|-------------------|
| Match 1 | 🔒 LOCKED | ✅ YES (view only) | ❌ NO | N/A (locked) |
| Match 2 | 🟢 UNLOCKED | ✅ YES | ✅ YES | Match 1 lineup ✅ |
| Match 3 | 🔒 BLOCKED | ❌ NO | ❌ NO | N/A (locked out) |

**Match 2 behavior:**
- Opens automatically with Match 1's lineup pre-filled
- User can edit before Oct 26, 10:00 AM
- Transfers counted from changes vs Match 1

---

### Current Time: Oct 26, 10:01 AM (Match 2 just locked)

| Match | Status | Can Access? | Can Edit? | Auto-Prefill From |
|-------|--------|-------------|-----------|-------------------|
| Match 1 | 🔒 LOCKED | ✅ YES (view only) | ❌ NO | N/A (locked) |
| Match 2 | 🔒 LOCKED | ✅ YES (view only) | ❌ NO | N/A (locked) |
| Match 3 | 🟢 UNLOCKED | ✅ YES | ✅ YES | Match 2 lineup ✅ |

**Match 3 behavior:**
- Opens automatically with Match 2's lineup pre-filled
- Transfers counted from changes vs Match 2 (NOT vs Match 1)
- Rolling baseline in effect

---

## 🎮 User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                            │
└─────────────────────────────────────────────────────────────────┘

Step 1: User Creates Team
    │
    ├─> Joins League
    └─> Selects 20-player squad
        │
        └─> Match 1 is OPEN ✅
            Match 2 is BLOCKED 🔒
            Match 3 is BLOCKED 🔒

Step 2: User Builds Match 1 XI (Before Oct 25, 10:00 AM)
    │
    ├─> Opens Match 1
    ├─> Selects 11 players
    ├─> Picks Captain & Vice-Captain
    └─> Saves ✅
        │
        ├─> Transfer Count: 0 (first match)
        └─> Waits for Match 1 to lock...

Step 3: Match 1 Deadline Passes (Oct 25, 10:00 AM)
    │
    └─> Match 1 LOCKS 🔒
        Match 2 UNLOCKS 🔓 ← Automatic!
        │
        └─> Notification: "Match 2 is now available!"

Step 4: User Edits Match 2 XI (Oct 25-26)
    │
    ├─> Opens Match 2
    ├─> Sees Match 1 lineup pre-filled ✅
    ├─> Changes 3 players
    ├─> Updates Captain
    └─> Saves ✅
        │
        ├─> Transfer Count: 3 + 1 (captain) = 4 total
        └─> Waits for Match 2 to lock...

Step 5: Match 2 Deadline Passes (Oct 26, 10:00 AM)
    │
    └─> Match 2 LOCKS 🔒
        Match 3 UNLOCKS 🔓 ← Automatic!
        │
        └─> Match 3 pre-filled with Match 2 lineup

Step 6: User Edits Match 3 XI
    │
    └─> Transfers counted from Match 2 → Match 3
        (Rolling baseline, NOT fixed to Match 1)
```

---

## ⏰ Real-Time Example

### Scenario: IPL Fantasy League

```
═══════════════════════════════════════════════════════════════════
March 25, 2025 - 07:30 PM    Match 1: MI vs CSK (Starts 8:00 PM)
═══════════════════════════════════════════════════════════════════

Current Time: 6:00 PM (2 hours before match)

User Dashboard:
┌────────────────────────────────────────────┐
│  ✅ Match 1: MI vs CSK                     │
│     Status: OPEN - Edit until 8:00 PM     │
│     XI Status: Saved ✅                    │
│                                            │
│  🔒 Match 2: RCB vs KKR                    │
│     Status: LOCKED                         │
│     Unlocks: March 26, 8:00 PM            │
│     (After Match 1 locks)                 │
│                                            │
│  🔒 Match 3: DC vs SRH                     │
│     Status: LOCKED                         │
│     Unlocks: March 27, 8:00 PM            │
│     (After Match 2 locks)                 │
└────────────────────────────────────────────┘

User Action: Clicks "Edit Match 2"
Result: ❌ Error Modal
┌────────────────────────────────────────────┐
│  ⚠️  Cannot Access Match 2 Yet             │
│                                            │
│  Match 2 will unlock after Match 1 locks  │
│  on March 25 at 8:00 PM.                  │
│                                            │
│  Time remaining: 2 hours                  │
│                                            │
│  [OK]                                      │
└────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════
March 25, 2025 - 08:01 PM    Match 1 just started
═══════════════════════════════════════════════════════════════════

Current Time: 8:01 PM (Match 1 locked!)

User Dashboard:
┌────────────────────────────────────────────┐
│  🔒 Match 1: MI vs CSK                     │
│     Status: LOCKED (In Progress)          │
│     XI: View Only (Can't Edit)            │
│                                            │
│  ✅ Match 2: RCB vs KKR                    │ ← UNLOCKED!
│     Status: OPEN - Edit until tomorrow    │
│     XI Status: Not Saved (Auto-prefilled) │
│     [EDIT LINEUP] ← Now clickable!        │
│                                            │
│  🔒 Match 3: DC vs SRH                     │
│     Status: LOCKED                         │
│     Unlocks: March 26, 8:00 PM            │
└────────────────────────────────────────────┘

User Action: Clicks "Edit Match 2"
Result: ✅ Editor Opens
┌────────────────────────────────────────────┐
│  Match 2: RCB vs KKR                      │
│  Deadline: March 26, 8:00 PM              │
│                                            │
│  ⚠️ Auto-filled from Match 1              │
│                                            │
│  [Virat Kohli] (C)     [MS Dhoni] (VC)   │
│  [Rohit Sharma]        [Jasprit Bumrah]  │
│  [Hardik Pandya]       [Rashid Khan]     │
│  ... (11 players total)                   │
│                                            │
│  Make changes to use transfers            │
│  Transfers available: 10                  │
│                                            │
│  [SAVE LINEUP]                            │
└────────────────────────────────────────────┘
```

---

## ❌ Blocked Scenarios

### Scenario 1: Try to Skip Ahead

```
User tries: Access Match 3 directly
System checks:
  ├─ Is Match 2 locked? NO ❌
  └─ Block access

Error Message:
┌────────────────────────────────────────────┐
│  🚫 Cannot Access Match 3                  │
│                                            │
│  You must wait for Match 2 deadline to    │
│  pass before editing Match 3.             │
│                                            │
│  Match 2 locks on: March 26, 8:00 PM     │
│  Current time: March 25, 9:00 PM         │
│                                            │
│  Time remaining: 23 hours                 │
└────────────────────────────────────────────┘
```

### Scenario 2: Try to Edit During Match

```
User tries: Edit Match 1 during live match
System checks:
  ├─ Is Match 1 locked? YES ✅
  └─ Show read-only view

Read-Only View:
┌────────────────────────────────────────────┐
│  🔒 Match 1: MI vs CSK (LOCKED)            │
│  Deadline Passed: March 25, 8:00 PM       │
│                                            │
│  Your Final XI:                           │
│  [Virat Kohli] (C)     [MS Dhoni] (VC)   │
│  [Rohit Sharma]        [Jasprit Bumrah]  │
│  ... (11 players)                         │
│                                            │
│  ⚠️ Lineup locked - cannot edit           │
│                                            │
│  Points earned: Calculating...            │
└────────────────────────────────────────────┘
```

---

## ✅ Allowed Scenarios

### Scenario 1: Forgot Previous Match

```
Situation: User forgot to save Match 1 XI

Timeline:
  Match 1 deadline: PASSED ✅ (locked with no saved XI)
  Match 2: Now unlocked

User Action: Opens Match 2
System Response:
┌────────────────────────────────────────────┐
│  ⚠️ Warning                                │
│                                            │
│  Previous match (Match 1) has no saved    │
│  lineup. You'll start with an empty squad │
│  for this match.                          │
│                                            │
│  [Continue]                               │
└────────────────────────────────────────────┘

Result: ✅ Can still access Match 2
        ✅ Selects fresh 11 players
        ✅ 0 transfers charged (treated as new baseline)
```

---

## 🎯 Key Takeaways

1. **Lock Status = Gate Key** 🔑
   - Match N deadline passes → Match N+1 unlocks
   - Not based on saved status, only time-based

2. **Auto-Prefill = Convenience** 🎁
   - Previous lineup auto-loads (if exists)
   - User can immediately see and tweak

3. **Rolling Baseline = Fair Counting** ⚖️
   - Transfers = changes from previous match ONLY
   - Not compared to fixed Match 1 baseline

4. **Graceful Degradation** 🛡️
   - Forgot previous match? Still can play
   - System doesn't break, just warns

5. **Sequential Flow = Fair Play** 🏅
   - Can't manipulate future lineups
   - Must play matches in order

---

**Your requirement is now fully implemented!** ✅
