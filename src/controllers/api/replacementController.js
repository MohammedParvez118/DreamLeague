// Squad Replacement Controller
// Handles player replacements for injured/unavailable players with admin approval

import { db as pool } from '../../config/database.js';

/**
 * POST /api/league/:leagueId/team/:teamId/replacements/request
 * User requests a player replacement
 */
export const requestReplacement = async (req, res) => {
  const { leagueId, teamId } = req.params;
  const { outPlayerId, inPlayerId, reason } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Validate outPlayer exists in squad and fetch details
    const squadCheck = await client.query(
      `SELECT fs.*, sp.name, sp.role, s.squad_type
       FROM fantasy_squads fs
       JOIN squad_players sp ON fs.player_id::text = sp.player_id::text
       JOIN squads s ON sp.squad_id = s.squad_id
       WHERE fs.team_id = $1 AND fs.player_id::text = $2::text
       LIMIT 1`,
      [teamId, outPlayerId]
    );

    if (squadCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Player to be replaced is not in your squad'
      });
    }

    const outPlayerData = squadCheck.rows[0];
    const outPlayerName = outPlayerData.name;
    const outPlayerRole = outPlayerData.role;
    const outPlayerSquad = outPlayerData.squad_type;

    // 2. Check if player is already injured/replaced
    if (outPlayerData.is_injured) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'This player is already marked as injured and replaced'
      });
    }

    // 3. Check if pending replacement already exists
    const existingRequest = await client.query(
      `SELECT * FROM squad_replacements
       WHERE team_id = $1 AND out_player_id::text = $2::text AND status = 'pending'`,
      [teamId, outPlayerId]
    );

    if (existingRequest.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Replacement request already pending for this player'
      });
    }

    // 4. Calculate matches played for injured player
    // Note: Points are calculated on-demand, not stored per player
    const matchesQuery = await client.query(
      `SELECT COUNT(DISTINCT tpxi.match_id) as matches_played
       FROM team_playing_xi tpxi
       WHERE tpxi.team_id = $1 AND tpxi.player_id::text = $2::text`,
      [teamId, outPlayerId]
    );

    const { matches_played = 0 } = matchesQuery.rows[0] || {};
    const total_points = 0; // Points preserved with injured player, calculated on-demand

    // 5. Check if inPlayer is available (not in any squad in this league)
    const availabilityCheck = await client.query(
      `SELECT fs.* FROM fantasy_squads fs
       JOIN fantasy_teams ft ON fs.team_id = ft.id
       WHERE ft.league_id = $1 AND fs.player_id::text = $2::text`,
      [leagueId, inPlayerId]
    );

    if (availabilityCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Replacement player is already in another team in this league'
      });
    }

    // 6. Fetch inPlayer details
    const inPlayerQuery = await client.query(
      `SELECT sp.name, sp.role, s.squad_type
       FROM squad_players sp
       JOIN squads s ON sp.squad_id = s.squad_id
       WHERE sp.player_id::text = $1::text
       LIMIT 1`,
      [inPlayerId]
    );

    if (inPlayerQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Replacement player not found'
      });
    }

    const inPlayerData = inPlayerQuery.rows[0];
    const inPlayerName = inPlayerData.name;
    const inPlayerRole = inPlayerData.role;
    const inPlayerSquad = inPlayerData.squad_type;

    // 7. Get next match ID (replacement starts from next match)
    const nextMatch = await client.query(
      `SELECT id, match_description, match_start
       FROM league_matches
       WHERE league_id = $1 AND match_start > NOW()
       ORDER BY match_start ASC
       LIMIT 1`,
      [leagueId]
    );

    const nextMatchId = nextMatch.rows.length > 0 ? nextMatch.rows[0].id : null;

    // 8. Create replacement request
    const replacement = await client.query(
      `INSERT INTO squad_replacements (
        team_id, league_id,
        out_player_id, out_player_name, out_player_role, out_player_squad,
        in_player_id, in_player_name, in_player_role, in_player_squad,
        reason, points_at_replacement, matches_played, replacement_start_match_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        teamId, leagueId,
        outPlayerId, outPlayerName, outPlayerRole, outPlayerSquad,
        inPlayerId, inPlayerName, inPlayerRole, inPlayerSquad,
        reason, total_points, matches_played, nextMatchId
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Replacement request submitted successfully. Awaiting admin approval.',
      data: {
        replacementId: replacement.rows[0].id,
        status: 'pending',
        outPlayer: {
          id: outPlayerId,
          name: outPlayerName,
          pointsEarned: total_points,
          matchesPlayed: matches_played
        },
        inPlayer: {
          id: inPlayerId,
          name: inPlayerName
        },
        nextMatch: nextMatch.rows.length > 0 ? {
          id: nextMatch.rows[0].id,
          description: nextMatch.rows[0].match_description,
          startTime: nextMatch.rows[0].match_start
        } : null,
        requestedAt: replacement.rows[0].requested_at
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
      `SELECT 
         sr.*,
         lm.match_description as start_match_description,
         lm.match_start as start_match_time
       FROM squad_replacements sr
       LEFT JOIN league_matches lm ON sr.replacement_start_match_id = lm.id
       WHERE sr.team_id = $1 AND sr.league_id = $2
       ORDER BY sr.requested_at DESC`,
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
            squad: r.out_player_squad,
            pointsEarned: r.points_at_replacement,
            matchesPlayed: r.matches_played
          },
          inPlayer: {
            id: r.in_player_id,
            name: r.in_player_name,
            role: r.in_player_role,
            squad: r.in_player_squad
          },
          reason: r.reason,
          status: r.status,
          startMatch: r.replacement_start_match_id ? {
            id: r.replacement_start_match_id,
            description: r.start_match_description,
            startTime: r.start_match_time
          } : null,
          requestedAt: r.requested_at,
          adminNotes: r.admin_notes,
          adminEmail: r.admin_email,
          reviewedAt: r.reviewed_at
        })),
        summary
      }
    });

  } catch (error) {
    console.error('Error fetching replacements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch replacements',
      details: error.message
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
        error: `Cannot cancel ${replacement.rows[0].status} replacement`
      });
    }

    // Delete the request
    await client.query(
      'DELETE FROM squad_replacements WHERE id = $1',
      [replacementId]
    );

    res.json({
      success: true,
      message: 'Replacement request cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling replacement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel replacement',
      details: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * GET /api/league/:leagueId/admin/replacements/pending
 * Get all pending replacements for admin review (league-wide)
 */
export const getPendingReplacements = async (req, res) => {
  const { leagueId } = req.params;
  const userEmail = req.query.userEmail; // From query param or auth

  try {
    // Verify user is admin (league creator)
    const adminCheck = await pool.query(
      `SELECT ft.is_admin FROM fantasy_teams ft
       JOIN fantasy_leagues fl ON ft.league_id = fl.id
       WHERE ft.league_id = $1 AND ft.team_owner = $2 AND ft.is_admin = TRUE`,
      [leagueId, userEmail]
    );

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Only league admin can view pending replacements'
      });
    }

    // Get all pending replacements
    const pending = await pool.query(
      `SELECT * FROM admin_pending_replacements
       WHERE league_id = $1
       ORDER BY requested_at ASC`,
      [leagueId]
    );

    res.json({
      success: true,
      data: {
        pendingReplacements: pending.rows.map(r => ({
          id: r.replacement_id,
          team: {
            id: r.team_id,
            name: r.team_name,
            owner: r.team_owner
          },
          outPlayer: {
            id: r.out_player_id,
            name: r.out_player_name,
            role: r.out_player_role,
            squad: r.out_player_squad,
            pointsEarned: r.points_at_replacement,
            matchesPlayed: r.matches_played
          },
          inPlayer: {
            id: r.in_player_id,
            name: r.in_player_name,
            role: r.in_player_role,
            squad: r.in_player_squad
          },
          reason: r.reason,
          nextMatch: r.next_match_id ? {
            id: r.next_match_id,
            description: r.next_match_description
          } : null,
          requestedAt: r.requested_at
        })),
        count: pending.rows.length
      }
    });

  } catch (error) {
    console.error('Error fetching pending replacements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending replacements',
      details: error.message
    });
  }
};

/**
 * POST /api/league/:leagueId/admin/replacements/:replacementId/review
 * Approve or reject a replacement request
 */
export const reviewReplacement = async (req, res) => {
  const { leagueId, replacementId } = req.params;
  const { action, adminNotes, userEmail } = req.body; // action: 'approved' or 'rejected'

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verify user is admin
    const adminCheck = await client.query(
      `SELECT ft.is_admin FROM fantasy_teams ft
       WHERE ft.league_id = $1 AND ft.team_owner = $2 AND ft.is_admin = TRUE`,
      [leagueId, userEmail]
    );

    if (adminCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: 'Only league admin can review replacements'
      });
    }

    // 2. Get replacement details
    const replacement = await client.query(
      `SELECT * FROM squad_replacements
       WHERE id = $1 AND league_id = $2 AND status = 'pending'`,
      [replacementId, leagueId]
    );

    if (replacement.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Pending replacement request not found'
      });
    }

    const r = replacement.rows[0];

    if (action === 'approved') {
      // APPROVAL FLOW
      
      // 3a. Update replacement status
      await client.query(
        `UPDATE squad_replacements
         SET status = 'approved',
             admin_email = $1,
             admin_notes = $2,
             reviewed_at = NOW()
         WHERE id = $3`,
        [userEmail, adminNotes, replacementId]
      );

      // 3b. Mark injured player in fantasy_squads
      await client.query(
        `UPDATE fantasy_squads
         SET is_injured = TRUE,
             injury_replacement_id = $1
         WHERE team_id = $2 AND player_id::text = $3::text`,
        [replacementId, r.team_id, r.out_player_id]
      );

      // 3c. Add replacement player to fantasy_squads
      await client.query(
        `INSERT INTO fantasy_squads (
          league_id, team_id, player_id, player_name, role, squad_name, 
          is_captain, is_vice_captain, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (league_id, player_id) WHERE player_id IS NOT NULL DO NOTHING`,
        [leagueId, r.team_id, r.in_player_id, r.in_player_name, r.in_player_role, r.in_player_squad, false, false]
      );

      // 3d. Replace in all future Playing XIs (using the function)
      const affectedMatches = await client.query(
        `SELECT * FROM apply_replacement_to_future_matches($1, $2, $3, $4, $5, $6, $7)`,
        [
          r.team_id,
          r.out_player_id,
          r.in_player_id,
          r.in_player_name,
          r.in_player_role,
          r.in_player_squad,
          r.replacement_start_match_id
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Replacement approved successfully',
        data: {
          replacementId: replacementId,
          status: 'approved',
          outPlayer: {
            id: r.out_player_id,
            name: r.out_player_name,
            markedInjured: true
          },
          inPlayer: {
            id: r.in_player_id,
            name: r.in_player_name,
            addedToSquad: true
          },
          playingXIUpdated: affectedMatches.rows.length > 0,
          affectedMatches: affectedMatches.rows.map(m => ({
            matchId: m.match_id,
            wasCaptain: m.was_captain,
            wasViceCaptain: m.was_vice_captain
          })),
          totalAffectedMatches: affectedMatches.rows.length
        }
      });

    } else if (action === 'rejected') {
      // REJECTION FLOW
      
      await client.query(
        `UPDATE squad_replacements
         SET status = 'rejected',
             admin_email = $1,
             admin_notes = $2,
             reviewed_at = NOW()
         WHERE id = $3`,
        [userEmail, adminNotes, replacementId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Replacement request rejected',
        data: {
          replacementId: replacementId,
          status: 'rejected',
          adminNotes: adminNotes
        }
      });

    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "approved" or "rejected"'
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reviewing replacement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to review replacement',
      details: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * GET /api/league/:leagueId/team/:teamId/squad-with-status
 * Get team squad with injury status highlighted and available players for replacement
 */
export const getSquadWithInjuryStatus = async (req, res) => {
  const { leagueId, teamId } = req.params;

  try {
    // Get league's tournament_id
    const leagueResult = await pool.query(
      `SELECT fl.tournament_id 
       FROM fantasy_leagues fl 
       WHERE fl.id = $1`,
      [leagueId]
    );

    if (leagueResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'League not found'
      });
    }

    const tournamentId = leagueResult.rows[0].tournament_id;

    if (!tournamentId) {
      return res.status(400).json({
        success: false,
        error: 'No tournament associated with this league'
      });
    }

    // Get team's current squad with injury status
    const squad = await pool.query(
      `SELECT 
         fs.id,
         fs.player_id,
         fs.player_name,
         fs.role,
         fs.squad_name as team_name,
         fs.is_injured,
         sr.id as replacement_id,
         sr.in_player_id as replaced_by_id,
         sr.in_player_name as replaced_by_name,
         sr.status as replacement_status
       FROM fantasy_squads fs
       LEFT JOIN squad_replacements sr 
         ON fs.team_id = sr.team_id 
         AND fs.player_id = sr.out_player_id
         AND sr.status IN ('pending', 'approved')
       WHERE fs.team_id = $1
       ORDER BY fs.is_injured DESC, fs.player_name ASC`,
      [teamId]
    );

    // Get all players already in squads in this league
    const usedPlayers = await pool.query(
      `SELECT DISTINCT fs.player_id
       FROM fantasy_squads fs
       JOIN fantasy_teams ft ON fs.team_id = ft.id
       WHERE ft.league_id = $1`,
      [leagueId]
    );

    const usedPlayerIds = usedPlayers.rows.map(p => p.player_id);

    // Get available players (not in any squad in this league)
    const availablePlayersQuery = usedPlayerIds.length > 0
      ? `SELECT DISTINCT
           sp.player_id,
           sp.name as player_name,
           sp.role,
           s.squad_type
         FROM squad_players sp
         JOIN squads s ON sp.squad_id = s.squad_id
         WHERE s.series_id = $1
         AND sp.player_id NOT IN (${usedPlayerIds.map((_, i) => `$${i + 2}`).join(',')})
         ORDER BY sp.name ASC`
      : `SELECT DISTINCT
           sp.player_id,
           sp.name as player_name,
           sp.role,
           s.squad_type
         FROM squad_players sp
         JOIN squads s ON sp.squad_id = s.squad_id
         WHERE s.series_id = $1
         ORDER BY sp.name ASC`;

    const availablePlayersParams = usedPlayerIds.length > 0 
      ? [tournamentId, ...usedPlayerIds] 
      : [tournamentId];

    const availablePlayers = await pool.query(availablePlayersQuery, availablePlayersParams);

    res.json({
      success: true,
      data: {
        squad: squad.rows.map(p => ({
          id: p.id,
          player_id: p.player_id,
          player_name: p.player_name,
          role: p.role,
          team_name: p.team_name,
          isInjured: p.is_injured || false,
          replacement: p.replacement_id ? {
            id: p.replacement_id,
            replacedById: p.replaced_by_id,
            replacedByName: p.replaced_by_name,
            status: p.replacement_status
          } : null
        })),
        availablePlayers: availablePlayers.rows.map(p => ({
          player_id: p.player_id,
          player_name: p.player_name,
          role: p.role,
          team_name: p.team_name
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching squad with injury status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch squad',
      details: error.message
    });
  }
};
