# Replacement System - Complete Implementation Summary

## 🎯 Feature Overview

Replaced the **Transfers** functionality with a comprehensive **Replacement System** for managing injured or unavailable players in fantasy squads.

### Key Differences from Playing XI Transfers

| Feature | Playing XI Transfers | Squad Replacements |
|---------|---------------------|-------------------|
| **Scope** | Match-by-match tactical changes | Squad-level (15-20 players) |
| **Purpose** | Team strategy optimization | Injury/unavailability management |
| **Approval** | Automatic (within limit) | Admin approval required |
| **Cost** | Uses transfer quota | No cost/limit |
| **Duration** | Single match | All future matches |
| **Points** | Normal | Stay with injured player |

---

## 📁 Files Created

### 1. Database Migration
- **`migrations/add_squad_replacements.sql`** (150+ lines)
  - ✅ Creates `squad_replacements` table (13 columns)
  - ✅ Adds `is_injured` boolean to `fantasy_squads`
  - ✅ Adds `is_admin` boolean to `fantasy_teams` (league creator)
  - ✅ Creates `admin_pending_replacements` view
  - ✅ Creates `apply_replacement_to_future_matches()` function
  - ✅ Adds update trigger for timestamps

- **`migrations/run-squad-replacement-migration.js`**
  - ✅ Migration runner script
  - ✅ Verifies 5 database structures
  - ✅ Reports admins set

### 2. Backend Controller
- **`src/controllers/api/replacementController.js`** (600+ lines)
  - ✅ `requestReplacement()` - Validate player, check availability, create request
  - ✅ `getTeamReplacements()` - Replacement history with summary
  - ✅ `cancelReplacement()` - Cancel pending requests
  - ✅ `getPendingReplacements()` - Admin-only, league-wide pending
  - ✅ `reviewReplacement()` - Approve/reject with auto-replacement
  - ✅ `getSquadWithInjuryStatus()` - Squad with injury flags

### 3. Backend Routes
- **`src/routes/api/replacement.js`**
  - ✅ POST `/league/:leagueId/team/:teamId/replacements/request`
  - ✅ GET `/league/:leagueId/team/:teamId/replacements`
  - ✅ DELETE `/league/:leagueId/team/:teamId/replacements/:replacementId`
  - ✅ GET `/league/:leagueId/team/:teamId/squad-with-status`
  - ✅ GET `/league/:leagueId/admin/replacements/pending`
  - ✅ POST `/league/:leagueId/admin/replacements/:replacementId/review`

### 4. Frontend Components
- **`client/src/components/ReplacementPanel.jsx`** (360+ lines)
  - ✅ Request replacement form (out player, in player, reason)
  - ✅ Squad display with injury status
  - ✅ Replacement history table
  - ✅ Cancel pending requests
  - ✅ Admin view toggle (for league creators)

- **`client/src/components/AdminReplacementView.jsx`** (240+ lines)
  - ✅ Pending requests list
  - ✅ Request details (player swap, reason, match info)
  - ✅ Approve/reject buttons
  - ✅ Admin notes input
  - ✅ Review confirmation modal

- **`client/src/components/ReplacementPanel.css`** (420+ lines)
  - ✅ Responsive grid layouts
  - ✅ Injury badge styling (red background)
  - ✅ Player card animations
  - ✅ Form styling
  - ✅ Status badges (pending/approved/rejected)

- **`client/src/components/AdminReplacementView.css`** (410+ lines)
  - ✅ Replacement card layouts
  - ✅ Player swap visual display
  - ✅ Modal styling
  - ✅ Approve/reject buttons
  - ✅ Mobile responsive design

### 5. Documentation
- **`docs/REPLACEMENT_SYSTEM_GUIDE.md`**
  - ✅ Complete implementation guide
  - ✅ API endpoint documentation
  - ✅ Database schema details
  - ✅ Frontend component preview

---

## 🔧 Files Modified

### 1. API Service
- **`client/src/services/api.js`**
  - ✅ Added `replacementAPI` object with 6 methods:
    - `requestReplacement(leagueId, teamId, data)`
    - `getTeamReplacements(leagueId, teamId)`
    - `cancelReplacement(leagueId, teamId, replacementId)`
    - `getSquadWithStatus(leagueId, teamId)`
    - `getPendingReplacements(leagueId, userEmail)` (admin)
    - `reviewReplacement(leagueId, replacementId, data)` (admin)

### 2. Main Routes
- **`src/routes/api/index.js`**
  - ✅ Imported `replacementRoutes`
  - ✅ Added `router.use('/', replacementRoutes)`

### 3. League View Page
- **`client/src/pages/league/ViewLeague.jsx`**
  - ✅ Replaced `TransferPanel` import with `ReplacementPanel`
  - ✅ Updated transfers tab to use `ReplacementPanel`
  - ✅ Added `userEmail` prop
  - ✅ Added `isAdmin` prop (checks `league.created_by === user.email`)

### 4. Tab Navigation
- **`client/src/components/league/TabNavigation.jsx`**
  - ✅ Updated tab label from "🔄 Transfers" to "🔄 Replacements"
  - ✅ Updated tooltip from "Manage player transfers" to "Replace injured or unavailable players"

---

## 🚀 How It Works

### User Flow
1. **Request Replacement**
   - User selects an injured/unavailable player from their squad
   - Selects a replacement player (from available players)
   - Provides reason for replacement
   - Submits request (status: pending)

2. **Admin Review**
   - League creator sees pending requests in admin view
   - Reviews player details, reason, points/matches earned
   - Can approve or reject with notes
   - On approval:
     - Injured player marked with `is_injured = TRUE`
     - Replacement added to squad
     - Auto-replaces in all future Playing XIs
     - Points preserved with injured player

3. **Post-Approval**
   - Injured player shows with red "INJURED" badge
   - Cannot be selected in new Playing XIs
   - Replacement player available for selection
   - History tracked in database

### Technical Flow (Approval)
```sql
BEGIN TRANSACTION;

-- 1. Mark injured player
UPDATE fantasy_squads 
SET is_injured = TRUE, injury_replacement_id = <in_player_id>
WHERE player_id = <out_player_id>;

-- 2. Add replacement to squad
INSERT INTO fantasy_squads (team_id, player_id, tournament_id)
VALUES (<team_id>, <in_player_id>, <tournament_id>);

-- 3. Call auto-replacement function
SELECT apply_replacement_to_future_matches(
  <team_id>, 
  <out_player_id>, 
  <in_player_id>, 
  <replacement_start_match_id>
);
-- This updates all team_playing_xi records for future matches

-- 4. Update replacement request
UPDATE squad_replacements
SET status = 'approved', admin_email = <admin>, reviewed_at = NOW();

COMMIT;
```

---

## 📊 Database Schema

### New Table: `squad_replacements`
| Column | Type | Description |
|--------|------|-------------|
| `replacement_id` | SERIAL PRIMARY KEY | Unique ID |
| `league_id` | INTEGER | League reference |
| `team_id` | INTEGER | Team reference |
| `out_player_id` | INTEGER | Injured/leaving player |
| `in_player_id` | INTEGER | Replacement player |
| `reason` | TEXT | Injury/unavailability reason |
| `status` | VARCHAR(20) | pending/approved/rejected |
| `requested_at` | TIMESTAMP | Request timestamp |
| `replacement_start_match_id` | INTEGER | Next match ID |
| `out_player_points_earned` | INTEGER | Points at time of request |
| `out_player_matches_played` | INTEGER | Matches at time of request |
| `admin_email` | VARCHAR(255) | Approving admin |
| `admin_notes` | TEXT | Admin comments |
| `reviewed_at` | TIMESTAMP | Review timestamp |

### Updated Tables
- **`fantasy_squads`**
  - `+ is_injured BOOLEAN DEFAULT FALSE`
  - `+ injury_replacement_id INTEGER` (FK to players)

- **`fantasy_teams`**
  - `+ is_admin BOOLEAN DEFAULT FALSE` (TRUE for league creators)

---

## 🎨 UI Features

### Replacement Panel (User View)
- **Request Form**
  - Dropdown: Out Player (eligible squad members)
  - Dropdown: In Player (available players)
  - Textarea: Reason for replacement
  - Submit button with validation

- **Current Squad Display**
  - Grid layout with player cards
  - Injured players: Red border + "INJURED" badge
  - Shows replacement name if applicable

- **Replacement History**
  - Table with all requests
  - Status badges (pending/approved/rejected)
  - Points/matches data for approved
  - Cancel button for pending
  - View notes for rejected

### Admin Replacement View
- **Pending Requests Card**
  - Team name and owner email
  - Player swap visual (OUT → IN)
  - Reason highlighted
  - Match info
  - Approve/Reject buttons

- **Review Modal**
  - Approval: Shows what will happen (4 steps)
  - Rejection: Requires admin notes
  - Confirmation before action

---

## ✅ Testing Checklist

### Before Testing
- [ ] Run database migration: `node migrations/run-squad-replacement-migration.js`
- [ ] Verify migration success (5 structures created)
- [ ] Check admins set correctly

### User Testing
- [ ] Request replacement with valid players
- [ ] Request shows in history as "pending"
- [ ] Cannot request replacement for already injured player
- [ ] Cannot request replacement with unavailable player
- [ ] Can cancel pending request
- [ ] Injured players show red badge

### Admin Testing
- [ ] League creator sees "View Pending Approvals" button
- [ ] Non-creator does not see button
- [ ] Pending requests show correctly
- [ ] Approve works: injured marked, replacement added, Playing XIs updated
- [ ] Reject works: status updated, notes saved
- [ ] Can view admin notes in rejection

### Integration Testing
- [ ] Approved replacement auto-replaces in all future Playing XIs
- [ ] Captain/Vice-captain status preserved if injured player had it
- [ ] Injured player cannot be selected in new Playing XIs
- [ ] Points stay with injured player (check match breakdown)
- [ ] Replacement player earns points normally after approval

---

## 🔑 Key Requirements Met

✅ **Admin = League creator only** - Checked via `league.created_by === user.email`  
✅ **Replacement from next match onwards** - Uses `replacement_start_match_id`  
✅ **Auto-replace in all future Playing XIs** - `apply_replacement_to_future_matches()` function  
✅ **Points stay with injured player** - No points transfer, `is_injured` flag preserves attribution  
✅ **Injured players marked in red** - CSS styling with "INJURED" badge  
✅ **Injured players blocked from selection** - Frontend filter + backend validation  
✅ **No replacement limits** - No quota system implemented  

---

## 🚀 Next Steps

1. **Run Migration**
   ```bash
   node migrations/run-squad-replacement-migration.js
   ```

2. **Start Backend**
   ```bash
   npm start
   ```

3. **Start Frontend**
   ```bash
   cd client
   npm start
   ```

4. **Test Workflow**
   - Create league (become admin)
   - Add players to squad
   - Request replacement
   - Switch to admin view
   - Approve replacement
   - Verify auto-replacement in Playing XIs

5. **Verify Points**
   - Play a match with injured player
   - Check points attributed to injured player (not replacement)
   - Verify injured player shows red in squad

---

## 📝 Notes

- **Backward Compatibility**: Old `TransferPanel` component still exists but is no longer used in `ViewLeague.jsx`
- **Migration Safety**: Migration script includes verification checks
- **Admin Detection**: Uses `fantasy_teams.is_admin` flag (set during migration for existing league creators)
- **Future Enhancements**: Could add email notifications for approval/rejection
- **Performance**: Uses database view for efficient admin queries

---

## 📞 Support

If issues arise:
1. Check browser console for frontend errors
2. Check server logs for backend errors
3. Verify migration ran successfully
4. Confirm `fantasy_teams.is_admin` is TRUE for league creator
5. Check network tab for API errors

---

**Implementation Date**: January 2025  
**Backend Status**: ✅ Complete  
**Frontend Status**: ✅ Complete  
**Migration Status**: ⏳ Pending (ready to run)  
**Testing Status**: ⏳ Pending

