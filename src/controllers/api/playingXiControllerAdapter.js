import pool from '../../config/database.js';
import * as SimplifiedController from './playingXiControllerSimplified.js';

/**
 * ============================================================================
 * ADAPTER LAYER FOR SIMPLIFIED CONTROLLER
 * ============================================================================
 * 
 * This adapter maintains backward compatibility with old routes while using
 * the new simplified sequential controller logic.
 * 
 * Old Route: /api/league/:leagueId/team/:teamId/match/:matchId/playing-xi
 * New Logic: Sequential validation, auto-prefill, rolling baseline
 */

/**
 * Adapter: GET /api/league/:leagueId/team/:teamId/match/:matchId/playing-xi
 * Maps to: SimplifiedController.getPlayingXI(teamId, matchId)
 */
export const getPlayingXI = async (req, res) => {
  const { leagueId, teamId, matchId } = req.params;
  
  // Transform old route params to new controller format
  req.params = { teamId, matchId };
  
  // Intercept response to transform 'lineup' to 'players' for backward compatibility
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    if (data.success && data.data && data.data.lineup) {
      data.data.players = data.data.lineup;
      delete data.data.lineup;
    }
    return originalJson(data);
  };
  
  // Call simplified controller
  return SimplifiedController.getPlayingXI(req, res);
};

/**
 * Adapter: POST /api/league/:leagueId/team/:teamId/match/:matchId/playing-xi
 * Maps to: SimplifiedController.savePlayingXI()
 */
export const savePlayingXI = async (req, res) => {
  const { leagueId, teamId, matchId } = req.params;
  const { players, captainId, viceCaptainId } = req.body;
  
  // Transform old request format to new controller format
  req.body = {
    teamId: parseInt(teamId),
    matchId: parseInt(matchId),
    leagueId: parseInt(leagueId),
    squad: players.map(p => ({
      playerId: String(p.player_id || p.playerId),
      playerName: p.player_name || p.playerName,
      playerRole: p.player_role || p.playerRole,
      squadName: p.squad_name || p.squadName
    })),
    captain: String(captainId),
    viceCaptain: String(viceCaptainId)
  };
  
  // Intercept response to transform field names for backward compatibility
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    if (data.success && data.data) {
      // Map new field names to old field names expected by frontend
      data.data.transfersUsed = data.data.transfersThisMatch || 0;
      data.data.captainChangesUsed = (data.data.details?.captainChangeCost || 0) + 
                                     (data.data.details?.vcChangeCost || 0);
    }
    return originalJson(data);
  };
  
  // Call simplified controller
  return SimplifiedController.savePlayingXI(req, res);
};

/**
 * Adapter: DELETE /api/league/:leagueId/team/:teamId/match/:matchId/playing-xi
 * Maps to: SimplifiedController.deletePlayingXI()
 */
export const deletePlayingXI = async (req, res) => {
  const { teamId, matchId } = req.params;
  
  // Transform params
  req.params = { teamId, matchId };
  
  // Call simplified controller
  return SimplifiedController.deletePlayingXI(req, res);
};

/**
 * Adapter: GET /api/league/:leagueId/team/:teamId/transfer-stats
 * Maps to: SimplifiedController.getTransferStats()
 */
export const getTransferStats = async (req, res) => {
  const { teamId } = req.params;
  
  // Transform params
  req.params = { teamId };
  
  // Call simplified controller
  return SimplifiedController.getTransferStats(req, res);
};

/**
 * Legacy functions that still use old logic
 * TODO: Migrate these to simplified approach
 */

/**
 * Check if match is locked (deadline passed)
 * GET /api/league/:leagueId/match/:matchId/is-locked
 */
export const checkMatchLock = async (req, res) => {
  const { leagueId, matchId } = req.params;

  try {
    const result = await pool.query(
      'SELECT match_start, is_completed FROM league_matches WHERE id = $1 AND league_id = $2',
      [matchId, leagueId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    const match = result.rows[0];
    const now = new Date();
    const matchStartTime = new Date(match.match_start);
    const isLocked = now >= matchStartTime;
    
    // Calculate seconds until match starts (for countdown timer)
    const secondsUntilStart = Math.max(0, Math.floor((matchStartTime - now) / 1000));

    res.json({
      success: true,
      data: {
        isLocked,
        isCompleted: match.is_completed,
        matchStart: match.match_start,
        secondsUntilStart
      }
    });
  } catch (error) {
    console.error('Error checking match lock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check match lock status',
      error: error.message
    });
  }
};

/**
 * Get all matches with Playing XI status for a team
 * GET /api/league/:leagueId/team/:teamId/matches-status
 */
export const getMatchesWithPlayingXIStatus = async (req, res) => {
  const { leagueId, teamId } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        m.id as match_id,
        m.match_id as tournament_match_id,
        m.match_start,
        m.match_description,
        m.is_completed,
        m.is_active,
        EXISTS(
          SELECT 1 FROM team_playing_xi 
          WHERE team_id = $1 AND match_id = m.id
        ) as has_playing_xi,
        (NOW() >= m.match_start) as is_locked
      FROM league_matches m
      WHERE m.league_id = $2
      ORDER BY m.match_start ASC`,
      [teamId, leagueId]
    );

    res.json({
      success: true,
      data: {
        matches: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching matches status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch matches status',
      error: error.message
    });
  }
};

/**
 * Copy Playing XI from one match to another
 * POST /api/league/:leagueId/team/:teamId/match/:matchId/copy-playing-xi
 * 
 * NOTE: This is deprecated in simplified approach (auto-prefill handles this)
 */
export const copyPlayingXI = async (req, res) => {
  const { leagueId, teamId, matchId } = req.params;
  const { fromMatchId } = req.body;

  try {
    // Check if target match is locked
    const targetMatch = await pool.query(
      'SELECT match_start FROM league_matches WHERE id = $1 AND league_id = $2',
      [matchId, leagueId]
    );

    if (targetMatch.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Target match not found'
      });
    }

    const isLocked = new Date() >= new Date(targetMatch.rows[0].match_start);

    if (isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Cannot copy to a locked match (deadline has passed)'
      });
    }

    // Get source Playing XI
    const sourcePlayingXI = await pool.query(
      `SELECT player_id, player_name, player_role, squad_name, is_captain, is_vice_captain
       FROM team_playing_xi
       WHERE team_id = $1 AND match_id = $2`,
      [teamId, fromMatchId]
    );

    if (sourcePlayingXI.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Source Playing XI not found'
      });
    }

    // Delete existing Playing XI for target match
    await pool.query(
      'DELETE FROM team_playing_xi WHERE team_id = $1 AND match_id = $2',
      [teamId, matchId]
    );

    // Copy to target match
    for (const player of sourcePlayingXI.rows) {
      await pool.query(
        `INSERT INTO team_playing_xi 
         (team_id, league_id, match_id, player_id, player_name, player_role, squad_name, is_captain, is_vice_captain)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          teamId,
          leagueId,
          matchId,
          player.player_id,
          player.player_name,
          player.player_role,
          player.squad_name,
          player.is_captain,
          player.is_vice_captain
        ]
      );
    }

    res.json({
      success: true,
      message: 'Playing XI copied successfully',
      data: {
        fromMatchId,
        toMatchId: matchId,
        playersCount: sourcePlayingXI.rows.length
      }
    });

  } catch (error) {
    console.error('Error copying Playing XI:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to copy Playing XI',
      error: error.message
    });
  }
};
