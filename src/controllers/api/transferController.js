import pool from '../../config/database.js';

/**
 * ============================================================================
 * TRANSFER CONTROLLER
 * ============================================================================
 * Handles player transfers/swaps within leagues
 */

/**
 * Get remaining transfers for a team
 * GET /api/league/:leagueId/team/:teamId/transfers/remaining
 */
export const getRemainingTransfers = async (req, res) => {
  const { leagueId, teamId } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM team_transfer_summary 
       WHERE team_id = $1 AND league_id = $2`,
      [teamId, leagueId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const summary = result.rows[0];

    res.json({
      success: true,
      data: {
        transferLimit: summary.transfer_limit,
        transfersUsed: summary.transfers_used,
        transfersRemaining: summary.transfers_remaining
      }
    });

  } catch (error) {
    console.error('Error fetching remaining transfers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transfer information',
      error: error.message
    });
  }
};

/**
 * Get transfer history for a team
 * GET /api/league/:leagueId/team/:teamId/transfers/history
 */
export const getTransferHistory = async (req, res) => {
  const { leagueId, teamId } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const result = await pool.query(
      `SELECT 
        id,
        from_player_id,
        from_player_name,
        to_player_id,
        to_player_name,
        transfer_date,
        used_transfer_count,
        reason,
        status
      FROM squad_transfers
      WHERE team_id = $1 AND league_id = $2
      ORDER BY transfer_date DESC
      LIMIT $3 OFFSET $4`,
      [teamId, leagueId, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM squad_transfers WHERE team_id = $1 AND league_id = $2',
      [teamId, leagueId]
    );

    res.json({
      success: true,
      data: {
        transfers: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error fetching transfer history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transfer history',
      error: error.message
    });
  }
};

/**
 * Perform a player transfer (swap)
 * POST /api/league/:leagueId/team/:teamId/transfer
 * 
 * Body: {
 *   fromPlayerId: "13866",  // Player to remove from squad
 *   toPlayerId: "13867",    // Player to add to squad
 *   reason: "Injury replacement"
 * }
 */
export const transferPlayer = async (req, res) => {
  const { leagueId, teamId } = req.params;
  const { fromPlayerId, toPlayerId, reason } = req.body;

  const client = await pool.connect();

  try {
    // Validation
    if (!fromPlayerId || !toPlayerId) {
      return res.status(400).json({
        success: false,
        message: 'Both fromPlayerId and toPlayerId are required'
      });
    }

    if (fromPlayerId === toPlayerId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer a player to themselves'
      });
    }

    // Check remaining transfers
    const transferCheck = await client.query(
      `SELECT * FROM team_transfer_summary 
       WHERE team_id = $1 AND league_id = $2`,
      [teamId, leagueId]
    );

    if (transferCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const transferInfo = transferCheck.rows[0];

    if (transferInfo.transfers_remaining <= 0) {
      return res.status(403).json({
        success: false,
        message: `Transfer limit reached. You have used all ${transferInfo.transfer_limit} transfers.`
      });
    }

    // Check if fromPlayer is in team's squad
    const fromPlayerCheck = await client.query(
      `SELECT id, player_name, player_id, squad_name 
       FROM fantasy_squads 
       WHERE team_id = $1 AND league_id = $2 AND player_id = $3`,
      [teamId, leagueId, fromPlayerId]
    );

    if (fromPlayerCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Player to remove is not in your squad'
      });
    }

    const fromPlayer = fromPlayerCheck.rows[0];

    // Check if toPlayer is available (not taken by another team)
    const toPlayerTakenCheck = await client.query(
      `SELECT ft.team_name, ft.team_owner 
       FROM fantasy_squads fs
       JOIN fantasy_teams ft ON fs.team_id = ft.id
       WHERE fs.league_id = $1 AND fs.player_id = $2 AND fs.team_id != $3`,
      [leagueId, toPlayerId, teamId]
    );

    if (toPlayerTakenCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Player already taken by ${toPlayerTakenCheck.rows[0].team_name}`
      });
    }

    // Get toPlayer details from tournament squad
    const toPlayerDetails = await client.query(
      `SELECT player_name, role, squad_id 
       FROM squad_players 
       WHERE player_id = $1`,
      [toPlayerId]
    );

    if (toPlayerDetails.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Player to add not found in tournament'
      });
    }

    const toPlayerInfo = toPlayerDetails.rows[0];

    // Get squad name
    const squadInfo = await client.query(
      `SELECT team_name FROM squads WHERE id = $1`,
      [toPlayerInfo.squad_id]
    );

    const toPlayerSquadName = squadInfo.rows.length > 0 ? squadInfo.rows[0].team_name : 'Unknown';

    // Start transaction
    await client.query('BEGIN');

    // Update fantasy_squads - replace player
    await client.query(
      `UPDATE fantasy_squads 
       SET player_id = $1, 
           player_name = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [toPlayerId, toPlayerInfo.player_name, fromPlayer.id]
    );

    // Record transfer in squad_transfers table
    await client.query(
      `INSERT INTO squad_transfers 
        (team_id, league_id, from_player_id, from_player_name, to_player_id, to_player_name, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        teamId,
        leagueId,
        fromPlayerId,
        fromPlayer.player_name,
        toPlayerId,
        toPlayerInfo.player_name,
        reason || 'Squad optimization',
        'completed'
      ]
    );

    // Remove from any Playing XI entries (cascade effect)
    const playingXIRemoval = await client.query(
      `DELETE FROM team_playing_xi 
       WHERE team_id = $1 AND player_id = $2
       RETURNING match_id`,
      [teamId, fromPlayerId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        removed: {
          playerId: fromPlayerId,
          playerName: fromPlayer.player_name
        },
        added: {
          playerId: toPlayerId,
          playerName: toPlayerInfo.player_name,
          squadName: toPlayerSquadName
        },
        transfersRemaining: transferInfo.transfers_remaining - 1,
        playingXIAffected: playingXIRemoval.rows.length,
        affectedMatches: playingXIRemoval.rows.map(r => r.match_id)
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error performing transfer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete transfer',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get available players for transfer
 * GET /api/league/:leagueId/team/:teamId/transfer/available
 * 
 * Returns players from tournament who are not taken by other teams
 */
export const getAvailablePlayersForTransfer = async (req, res) => {
  const { leagueId, teamId } = req.params;
  const { search = '', role = '' } = req.query;

  try {
    // Get tournament_id for this league
    const leagueInfo = await pool.query(
      'SELECT tournament_id FROM fantasy_leagues WHERE id = $1',
      [leagueId]
    );

    if (leagueInfo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'League not found'
      });
    }

    const tournamentId = leagueInfo.rows[0].tournament_id;

    // Get all taken players in this league (excluding current team)
    const takenPlayers = await pool.query(
      `SELECT DISTINCT player_id 
       FROM fantasy_squads 
       WHERE league_id = $1 AND team_id != $2`,
      [leagueId, teamId]
    );

    const takenPlayerIds = takenPlayers.rows.map(r => r.player_id);

    // Build query for available players
    let query = `
      SELECT DISTINCT
        sp.player_id,
        sp.player_name,
        sp.role,
        s.team_name AS squad_name
      FROM squad_players sp
      JOIN squads s ON sp.squad_id = s.id
      WHERE s.tournament_id = $1
    `;

    const queryParams = [tournamentId];
    let paramIndex = 2;

    // Exclude taken players
    if (takenPlayerIds.length > 0) {
      query += ` AND sp.player_id NOT IN (${takenPlayerIds.map(() => `$${paramIndex++}`).join(', ')})`;
      queryParams.push(...takenPlayerIds);
    }

    // Search filter
    if (search) {
      query += ` AND sp.player_name ILIKE $${paramIndex++}`;
      queryParams.push(`%${search}%`);
    }

    // Role filter
    if (role) {
      query += ` AND sp.role ILIKE $${paramIndex++}`;
      queryParams.push(`%${role}%`);
    }

    query += ` ORDER BY sp.player_name LIMIT 200`;

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: {
        players: result.rows,
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Error fetching available players:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available players',
      error: error.message
    });
  }
};

/**
 * Undo last transfer (within 5 minutes window)
 * POST /api/league/:leagueId/team/:teamId/transfer/undo
 */
export const undoLastTransfer = async (req, res) => {
  const { leagueId, teamId } = req.params;

  const client = await pool.connect();

  try {
    // Get last transfer
    const lastTransfer = await client.query(
      `SELECT * FROM squad_transfers 
       WHERE team_id = $1 AND league_id = $2 AND status = 'completed'
       ORDER BY transfer_date DESC 
       LIMIT 1`,
      [teamId, leagueId]
    );

    if (lastTransfer.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No transfers found to undo'
      });
    }

    const transfer = lastTransfer.rows[0];

    // Check if within 5 minutes
    const transferTime = new Date(transfer.transfer_date);
    const now = new Date();
    const minutesPassed = (now - transferTime) / (1000 * 60);

    if (minutesPassed > 5) {
      return res.status(403).json({
        success: false,
        message: 'Transfer can only be undone within 5 minutes'
      });
    }

    await client.query('BEGIN');

    // Reverse the transfer in fantasy_squads
    await client.query(
      `UPDATE fantasy_squads 
       SET player_id = $1, 
           player_name = $2,
           updated_at = NOW()
       WHERE team_id = $3 AND player_id = $4`,
      [transfer.from_player_id, transfer.from_player_name, teamId, transfer.to_player_id]
    );

    // Mark transfer as reversed
    await client.query(
      `UPDATE squad_transfers 
       SET status = 'reversed', used_transfer_count = 0
       WHERE id = $1`,
      [transfer.id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Transfer reversed successfully',
      data: {
        restoredPlayer: {
          playerId: transfer.from_player_id,
          playerName: transfer.from_player_name
        },
        removedPlayer: {
          playerId: transfer.to_player_id,
          playerName: transfer.to_player_name
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error undoing transfer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to undo transfer',
      error: error.message
    });
  } finally {
    client.release();
  }
};
