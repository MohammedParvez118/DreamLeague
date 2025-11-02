# Quick Reference Card 📋

## System Overview

**Type:** Fantasy Cricket - Sequential Playing XI with Auto-Save  
**Key Feature:** Rolling baseline with automatic lineup copying  
**Transfer System:** Limited transfers per league (admin configurable)

---

## ⚡ Quick Facts

| Feature | Implementation |
|---------|----------------|
| **Sequential Unlocking** | Match N+1 only after Match N locks (deadline) |
| **Auto-Save** | Previous lineup auto-copied on first access |
| **Baseline** | Rolling (M2 vs M1, M3 vs M2, NOT all vs M1) |
| **Transfers** | Counted only on changes from auto-saved |
| **C/VC Changes** | 1 free each, then 1 transfer per change |
| **DELETE Endpoint** | ❌ Removed (incompatible) |

---

## 🔄 User Flow (3 Steps)

```
STEP 1: Match 1
└─ User selects 11 players + C + VC → Save → 0 transfers

STEP 2: Match 2 (after Match 1 locks)
└─ Opens editor → Auto-prefilled from Match 1 (already saved!)
   ├─ Keep as-is → Save → 0 transfers
   └─ Change 3 players → Save → 3 transfers

STEP 3: Match 3 (after Match 2 locks)
└─ Opens editor → Auto-prefilled from Match 2 (NOT Match 1!)
   └─ Changes calculated from Match 2 only
```

---

## 🎯 Key Behaviors

### ✅ DO
- Edit and save to change lineup (overwrites automatically)
- Keep auto-prefilled lineup for 0 transfers
- Use free C/VC changes strategically
- Review transfer count before saving

### ❌ DON'T
- Try to skip matches (blocked by system)
- Expect delete button (removed for safety)
- Think baseline is fixed to Match 1 (it rolls!)
- Edit after deadline (locked, read-only)

---

## 🔧 Technical Quick Reference

### Database Tables
```
fantasy_leagues.transfer_limit → Max transfers
fantasy_teams.captain_free_change_used → C free change tracking
fantasy_teams.vice_captain_free_change_used → VC free change tracking
team_playing_xi → Match lineups (11 rows per match)
league_matches → Match schedule and deadlines
```

### Key Controllers
```
playingXiControllerSimplified.js → Core logic
playingXiControllerAdapter.js → Compatibility layer
```

### API Endpoints
```
GET  /api/.../match/:id/playing-xi → Get (with auto-save)
POST /api/.../match/:id/playing-xi → Save/update
GET  /api/.../matches-status → List all matches
GET  /api/.../transfer-stats → Transfer summary
```

---

## 🐛 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Cannot access Match 2" | Match 1 not locked yet | Wait for Match 1 deadline |
| "Previous match has no lineup" | Match 1 never saved | Save Match 1 first |
| Transfer count wrong | Frontend display issue | Check `transferStats` in API response |
| Can't edit lineup | Match deadline passed | Read-only after lock |
| Delete button missing | Intentionally removed | Use edit/save instead |

---

## 📊 Transfer Calculation Example

```
Match 1: [A, B, C, D, E, F, G, H, I, J, K] (C=A, VC=B)
└─ Save → 0 transfers

Match 2: Auto-copied [A, B, C, D, E, F, G, H, I, J, K]
├─ User changes to: [A, B, C, D, E, X, Y, Z, I, J, K]
├─ Removed: F, G, H (3 players)
├─ Added: X, Y, Z (3 players)
├─ Net changes: 3 transfers
├─ C=A (no change), VC=B (no change)
└─ Total: 3 transfers used

Match 3: Auto-copied [A, B, C, D, E, X, Y, Z, I, J, K]
├─ User changes captain A → D
├─ Player changes: 0
├─ Captain change: First time (free) = 0 transfers
├─ Set captain_free_change_used = true
└─ Total: 0 transfers (3 used total)
```

---

## ✅ Testing Checklist

- [ ] Create Match 1 → Save → 0 transfers ✅
- [ ] Try Match 2 before Match 1 locks → Blocked ✅
- [ ] Wait for Match 1 lock → Match 2 unlocks ✅
- [ ] Open Match 2 → Pre-filled from Match 1 ✅
- [ ] Save Match 2 unchanged → 0 transfers ✅
- [ ] Edit Match 2 (3 changes) → Save → 3 transfers ✅
- [ ] Open Match 3 → Pre-filled from Match 2 (not M1) ✅
- [ ] Change captain first time → 0 transfers (free) ✅
- [ ] Change captain again → 1 transfer ✅
- [ ] Reach transfer limit → Blocked ✅

---

## 📞 Quick Support

**Backend Issues:** Check server logs, verify database schema  
**Frontend Issues:** Check browser console (F12)  
**API Testing:** Use Postman collection in `/tests/`  
**Documentation:** All `.md` files in project root

---

## 🎯 Success Metrics

✅ Sequential flow maintained (no skipped matches)  
✅ Auto-save working (pre-filled lineups)  
✅ Transfer calculation accurate (rolling baseline)  
✅ No DELETE-related confusion (removed)  
✅ Clear error messages (with timestamps)

**System Status: PRODUCTION READY** 🚀
