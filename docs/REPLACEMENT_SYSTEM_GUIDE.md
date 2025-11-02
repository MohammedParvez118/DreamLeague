# Player Replacement System - Implementation Guide

## 📋 Overview

Replace the "Transfers" tab with a "Replacements" system that allows users to replace injured/unavailable players from their 15-20 player squad with admin approval.

### Key Differences: Replacements vs Playing XI Transfers

| Feature | Squad Replacements (NEW) | Playing XI Transfers (Existing) |
|---------|-------------------------|--------------------------------|
| **Purpose** | Replace injured/unavailable players from squad | Swap players in match-by-match lineup |
| **Scope** | Affects 15-20 player squad | Affects 11-player match lineup |
| **Approval** | Requires admin approval | Automatic (within transfer limit) |
| **Reason** | Player injury/tournament exit | Tactical changes per match |
| **Points** | Previous points retained | Calculated per match |
| **Location** | League View → Replacements tab | League View → Playing XI tab |
| **Limit** | Unlimited (with approval) | 10 transfers per tournament |

---

## 🗄️ Database Schema

### 1. Squad Replacements Table

```sql
CREATE TABLE squad_replacements (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  league_id INTEGER NOT NULL REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
  
  -- Player being replaced
  out_player_id VARCHAR(50) NOT NULL,
  out_player_name TEXT NOT NULL,
  out_player_role VARCHAR(50),
  out_player_squad VARCHAR(100),
  
  -- Replacement player
  in_player_id VARCHAR(50) NOT NULL,
  in_player_name TEXT NOT NULL,
  in_player_role VARCHAR(50),
  in_player_squad VARCHAR(100),
  
  -- Replacement details
  reason TEXT NOT NULL, -- User provided reason (injury, unavailable, etc.)
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  
  -- Points preservation
  points_transferred INTEGER DEFAULT 0, -- Points earned by out_player
  matches_played INTEGER DEFAULT 0, -- How many matches out_player participated
  
  -- Admin action
  admin_email VARCHAR(255), -- Admin who approved/rejected
  admin_notes TEXT, -- Admin's reasoning
  reviewed_at TIMESTAMP,
  
  -- Timestamps
  requested_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_status CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT check_different_players CHECK (out_player_id <> in_player_id)
);

-- Indexes for performance
CREATE INDEX idx_squad_replacements_team ON squad_replacements(team_id);
CREATE INDEX idx_squad_replacements_league ON squad_replacements(league_id);
CREATE INDEX idx_squad_replacements_status ON squad_replacements(status);
CREATE INDEX idx_squad_replacements_requested ON squad_replacements(requested_at DESC);

-- Comments
COMMENT ON TABLE squad_replacements IS 'Tracks squad player replacements with admin approval';
COMMENT ON COLUMN squad_replacements.points_transferred IS 'Points earned by replaced player before injury';
COMMENT ON COLUMN squad_replacements.status IS 'pending: awaiting admin review, approved: replacement completed, rejected: request denied';
```

### 2. Update Fantasy Teams Table

```sql
-- Add admin flag to fantasy_teams to identify league admins
ALTER TABLE fantasy_teams
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Update creator to be admin
UPDATE fantasy_teams ft
SET is_admin = TRUE
FROM fantasy_leagues fl
WHERE ft.league_id = fl.id 
  AND ft.team_owner = fl.created_by;

COMMENT ON COLUMN fantasy_teams.is_admin IS 'TRUE if team owner is league admin/creator';
```

---

## 🎯 API Endpoints

### 1. User Endpoints

#### Request Replacement
```
POST /api/league/:leagueId/team/:teamId/replacements/request
```

**Request Body:**
```json
{
  "outPlayerId": "793463",
  "outPlayerName": "Kuldeep Yadav",
  "outPlayerRole": "Bowler",
  "outPlayerSquad": "India",
  "inPlayerId": "398381",
  "inPlayerName": "Yuzvendra Chahal",
  "inPlayerRole": "Bowler",
  "inPlayerSquad": "India",
  "reason": "Player injured in Match 3 and ruled out of tournament"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Replacement request submitted. Awaiting admin approval.",
  "data": {
    "replacementId": 1,
    "status": "pending",
    "outPlayer": { "id": "793463", "name": "Kuldeep Yadav" },
    "inPlayer": { "id": "398381", "name": "Yuzvendra Chahal" },
    "pointsToTransfer": 45,
    "matchesPlayed": 3
  }
}
```

#### Get Replacement History
```
GET /api/league/:leagueId/team/:teamId/replacements
```

**Response:**
```json
{
  "success": true,
  "data": {
    "replacements": [
      {
        "id": 1,
        "outPlayer": {
          "id": "793463",
          "name": "Kuldeep Yadav",
          "role": "Bowler",
          "squad": "India"
        },
        "inPlayer": {
          "id": "398381",
          "name": "Yuzvendra Chahal",
          "role": "Bowler",
          "squad": "India"
        },
        "reason": "Player injured in Match 3",
        "status": "pending",
        "pointsTransferred": 45,
        "matchesPlayed": 3,
        "requestedAt": "2025-11-01T10:30:00Z"
      }
    ],
    "summary": {
      "pending": 1,
      "approved": 2,
      "rejected": 0,
      "totalReplacements": 3
    }
  }
}
```

#### Cancel Pending Replacement
```
DELETE /api/league/:leagueId/team/:teamId/replacements/:replacementId
```

**Response:**
```json
{
  "success": true,
  "message": "Replacement request cancelled"
}
```

---

### 2. Admin Endpoints

#### Get All Pending Replacements (League-wide)
```
GET /api/league/:leagueId/admin/replacements/pending
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pendingReplacements": [
      {
        "id": 1,
        "team": {
          "id": 1,
          "name": "Team Virat",
          "owner": "user@example.com"
        },
        "outPlayer": { "id": "793463", "name": "Kuldeep Yadav" },
        "inPlayer": { "id": "398381", "name": "Yuzvendra Chahal" },
        "reason": "Player injured",
        "pointsToTransfer": 45,
        "matchesPlayed": 3,
        "requestedAt": "2025-11-01T10:30:00Z"
      }
    ],
    "count": 1
  }
}
```

#### Approve/Reject Replacement
```
POST /api/league/:leagueId/admin/replacements/:replacementId/review
```

**Request Body:**
```json
{
  "action": "approved",  // "approved" or "rejected"
  "adminNotes": "Verified: Player ruled out due to injury. Replacement approved."
}
```

**Response (Approved):**
```json
{
  "success": true,
  "message": "Replacement approved successfully",
  "data": {
    "replacementId": 1,
    "status": "approved",
    "squadUpdated": true,
    "pointsTransferred": 45,
    "playingXIUpdated": true, // If player was in Playing XI
    "affectedMatches": [4, 5, 6] // Future matches where replacement applied
  }
}
```

**Response (Rejected):**
```json
{
  "success": true,
  "message": "Replacement request rejected",
  "data": {
    "replacementId": 1,
    "status": "rejected",
    "reason": "Player is not confirmed as unavailable"
  }
}
```

---

## 🔧 Backend Implementation

### File Structure
```
src/
├── controllers/
│   └── api/
│       └── replacementController.js    # NEW
├── routes/
│   └── api/
│       └── replacement.js              # NEW
└── migrations/
    └── add_squad_replacements.sql      # NEW
```

### Controller Functions

#### replacementController.js

```javascript
import { pool } from '../../config/database.js';

/**
 * POST /api/league/:leagueId/team/:teamId/replacements/request
 * Request a player replacement
 */
export const requestReplacement = async (req, res) => {
  const { leagueId, teamId } = req.params;
  const {
    outPlayerId,
    outPlayerName,
    outPlayerRole,
    outPlayerSquad,
    inPlayerId,
    inPlayerName,
    inPlayerRole,
    inPlayerSquad,
    reason
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Validate out_player exists in squad
    const squadCheck = await client.query(
      `SELECT * FROM fantasy_squads
       WHERE team_id = $1 AND player_id = $2`,
      [teamId, outPlayerId]
    );

    if (squadCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Player to be replaced is not in your squad'
      });
    }

    // 2. Check if replacement already requested for this player
    const existingRequest = await client.query(
      `SELECT * FROM squad_replacements
       WHERE team_id = $1 AND out_player_id = $2 AND status = 'pending'`,
      [teamId, outPlayerId]
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Replacement already requested for this player'
      });
    }

    // 3. Calculate points earned by out_player
    const pointsQuery = await client.query(
      `SELECT 
         COUNT(DISTINCT tpxi.match_id) as matches_played,
         COALESCE(SUM(tms.match_points), 0) as total_points
       FROM team_playing_xi tpxi
       LEFT JOIN team_match_scores tms 
         ON tms.team_id = tpxi.team_id 
         AND tms.match_id = tpxi.match_id 
         AND tms.player_id = tpxi.player_id
       WHERE tpxi.team_id = $1 AND tpxi.player_id = $2`,
      [teamId, outPlayerId]
    );

    const { matches_played = 0, total_points = 0 } = pointsQuery.rows[0] || {};

    // 4. Check if in_player is available (not in any squad in this league)
    const availabilityCheck = await client.query(
      `SELECT fs.* FROM fantasy_squads fs
       JOIN fantasy_teams ft ON fs.team_id = ft.id
       WHERE ft.league_id = $1 AND fs.player_id = $2`,
      [leagueId, inPlayerId]
    );

    if (availabilityCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Replacement player is already in another team'
      });
    }

    // 5. Create replacement request
    const replacement = await client.query(
      `INSERT INTO squad_replacements (
        team_id, league_id,
        out_player_id, out_player_name, out_player_role, out_player_squad,
        in_player_id, in_player_name, in_player_role, in_player_squad,
        reason, points_transferred, matches_played
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        teamId, leagueId,
        outPlayerId, outPlayerName, outPlayerRole, outPlayerSquad,
        inPlayerId, inPlayerName, inPlayerRole, inPlayerSquad,
        reason, total_points, matches_played
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Replacement request submitted. Awaiting admin approval.',
      data: {
        replacementId: replacement.rows[0].id,
        status: replacement.rows[0].status,
        outPlayer: {
          id: outPlayerId,
          name: outPlayerName
        },
        inPlayer: {
          id: inPlayerId,
          name: inPlayerName
        },
        pointsToTransfer: total_points,
        matchesPlayed: matches_played
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error requesting replacement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request replacement',
      details: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * GET /api/league/:leagueId/team/:teamId/replacements
 * Get replacement history for a team
 */
export const getTeamReplacements = async (req, res) => {
  const { leagueId, teamId } = req.params;

  try {
    const replacements = await pool.query(
      `SELECT * FROM squad_replacements
       WHERE team_id = $1 AND league_id = $2
       ORDER BY requested_at DESC`,
      [teamId, leagueId]
    );

    const summary = {
      pending: replacements.rows.filter(r => r.status === 'pending').length,
      approved: replacements.rows.filter(r => r.status === 'approved').length,
      rejected: replacements.rows.filter(r => r.status === 'rejected').length,
      totalReplacements: replacements.rows.length
    };

    res.json({
      success: true,
      data: {
        replacements: replacements.rows.map(r => ({
          id: r.id,
          outPlayer: {
            id: r.out_player_id,
            name: r.out_player_name,
            role: r.out_player_role,
            squad: r.out_player_squad
          },
          inPlayer: {
            id: r.in_player_id,
            name: r.in_player_name,
            role: r.in_player_role,
            squad: r.in_player_squad
          },
          reason: r.reason,
          status: r.status,
          pointsTransferred: r.points_transferred,
          matchesPlayed: r.matches_played,
          requestedAt: r.requested_at,
          adminNotes: r.admin_notes,
          reviewedAt: r.reviewed_at
        })),
        summary
      }
    });

  } catch (error) {
    console.error('Error fetching replacements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch replacements'
    });
  }
};

/**
 * DELETE /api/league/:leagueId/team/:teamId/replacements/:replacementId
 * Cancel a pending replacement request
 */
export const cancelReplacement = async (req, res) => {
  const { leagueId, teamId, replacementId } = req.params;

  const client = await pool.connect();

  try {
    // Check if replacement exists and is pending
    const replacement = await client.query(
      `SELECT * FROM squad_replacements
       WHERE id = $1 AND team_id = $2 AND league_id = $3`,
      [replacementId, teamId, leagueId]
    );

    if (replacement.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Replacement request not found'
      });
    }

    if (replacement.rows[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel replacement with status: ${replacement.rows[0].status}`
      });
    }

    // Delete the request
    await client.query(
      'DELETE FROM squad_replacements WHERE id = $1',
      [replacementId]
    );

    res.json({
      success: true,
      message: 'Replacement request cancelled'
    });

  } catch (error) {
    console.error('Error cancelling replacement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel replacement'
    });
  } finally {
    client.release();
  }
};

// Admin functions continue in next comment...
```

**Continue in next message due to length...**

---

## 🎨 Frontend Implementation Preview

### ReplacementPanel Component Structure

```jsx
// client/src/components/ReplacementPanel.jsx

const ReplacementPanel = ({ leagueId, teamId, tournamentId, isAdmin }) => {
  // State for replacement form
  const [selectedOutPlayer, setSelectedOutPlayer] = useState(null);
  const [selectedInPlayer, setSelectedInPlayer] = useState(null);
  const [reason, setReason] = useState('');
  const [replacements, setReplacements] = useState([]);
  const [pendingReplacements, setPendingReplacements] = useState([]);
  
  // Admin view vs User view
  return (
    <div className="replacement-panel">
      {isAdmin ? (
        <AdminReplacementView />
      ) : (
        <UserReplacementView />
      )}
    </div>
  );
};
```

---

## 📝 Next Steps

1. Create database migration
2. Implement backend controller
3. Create API routes
4. Build frontend ReplacementPanel component
5. Add admin approval interface
6. Update ViewLeague.jsx to use Replacements instead of Transfers
7. Test complete flow

Would you like me to proceed with the full implementation?
