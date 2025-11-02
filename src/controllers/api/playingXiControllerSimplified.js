import pool from '../../config/database.js';

/**
 * ============================================================================
 * SIMPLIFIED PLAYING XI CONTROLLER - SEQUENTIAL LOCK SYSTEM
 * ============================================================================
 * 
 * Core Logic:
 * 1. Users can only save Playing XI for the next available match
 * 2. Next available = previous match is locked (deadline passed)
 * 3. Auto-prefill from previous match lineup
 * 4. Count transfers by comparing current vs previous
 * 5. Captain/VC changes always cost 1 transfer each
 * 6. Transfer limit set by admin per league
 */

/**
 * Get the previous match for a given match
 * Returns the most recent match before the current one
 */
async function getPreviousMatch(client, leagueId, currentMatchId) {
  const result = await client.query(
    `SELECT id, match_start, is_completed
     FROM league_matches
     WHERE league_id = $1 AND id < $2
     ORDER BY id DESC
     LIMIT 1`,
    [leagueId, currentMatchId]
  );
  
  return result.rows[0] || null;
}

/**
 * Get Playing XI for a specific match
 */
async function getPlayingXIData(client, teamId, matchId) {
  const result = await client.query(
    `SELECT player_id, player_name, player_role, squad_name,
            is_captain, is_vice_captain
     FROM team_playing_xi
     WHERE team_id = $1 AND match_id = $2
     ORDER BY 
       CASE 
         WHEN is_captain THEN 1
         WHEN is_vice_captain THEN 2
         ELSE 3
       END,
       player_name`,
    [teamId, matchId]
  );
  
  return result.rows;
}

/**
 * Calculate transfers between two lineups
 * Returns: { transfersUsed, playersAdded, playersRemoved }
 */
function calculateTransfers(previousLineup, currentLineup) {
  if (!previousLineup || previousLineup.length === 0) {
    // First match - no transfers
    return {
      transfersUsed: 0,
      playersAdded: [],
      playersRemoved: []
    };
  }
  
  const prevPlayerIds = new Set(previousLineup.map(p => String(p.player_id)));
  const currPlayerIds = new Set(currentLineup.map(p => String(p.player_id)));
  
  const playersAdded = currentLineup.filter(p => !prevPlayerIds.has(String(p.player_id)));
  const playersRemoved = previousLineup.filter(p => !currPlayerIds.has(String(p.player_id)));
  
  // Each player change = 1 transfer
  const transfersUsed = playersAdded.length;
  
  return {
    transfersUsed,
    playersAdded: playersAdded.map(p => ({ id: p.player_id, name: p.player_name })),
    playersRemoved: playersRemoved.map(p => ({ id: p.player_id, name: p.player_name }))
  };
}

/**
 * Calculate captain/VC changes - each change costs 1 transfer
 * Returns: { captainCost, vcCost }
 */
function calculateCaptainChanges(previousLineup, currentLineup) {
  if (!previousLineup || previousLineup.length === 0) {
    // First match - no changes
    return {
      captainCost: 0,
      vcCost: 0
    };
  }
  
  const prevCaptain = previousLineup.find(p => p.is_captain);
  const prevVC = previousLineup.find(p => p.is_vice_captain);
  const currCaptain = currentLineup.find(p => p.is_captain);
  const currVC = currentLineup.find(p => p.is_vice_captain);
  
  let captainCost = 0;
  let vcCost = 0;
  
  // Check captain change - always costs 1 transfer
  if (prevCaptain && currCaptain && String(prevCaptain.player_id) !== String(currCaptain.player_id)) {
    captainCost = 1;
  }
  
  // Check VC change - always costs 1 transfer
  if (prevVC && currVC && String(prevVC.player_id) !== String(currVC.player_id)) {
    vcCost = 1;
  }
  
  return {
    captainCost,
    vcCost
  };
}

/**
 * GET /api/playing-xi/:teamId/:matchId
 * Get Playing XI for a specific match with auto-prefill logic
 */
export const getPlayingXI = async (req, res) => {
  const { teamId, matchId } = req.params;
  
  const client = await pool.connect();
  
  try {
    // Get match info
    const matchResult = await client.query(
      `SELECT m.id, m.league_id, m.match_start, m.is_completed,
              l.transfer_limit
       FROM league_matches m
       JOIN fantasy_leagues l ON m.league_id = l.id
       WHERE m.id = $1`,
      [matchId]
    );
    
    if (matchResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }
    
    const match = matchResult.rows[0];
    const isLocked = new Date() >= new Date(match.match_start);
    
    // Get current lineup if exists
    let currentLineup = await getPlayingXIData(client, teamId, matchId);
    
    // Get previous match
    const previousMatch = await getPreviousMatch(client, match.league_id, matchId);
    
    // Validation: Can user access this match?
    // REQUIREMENT: Cannot access Match N+1 until Match N is LOCKED (deadline passed)
    let canEdit = true;
    let errorMessage = null;
    
    if (isLocked) {
      canEdit = false;
      errorMessage = 'Match deadline has passed. Lineup is locked.';
    } else if (previousMatch) {
      // Check if previous match is LOCKED (deadline passed)
      const previousIsLocked = new Date() >= new Date(previousMatch.match_start);
      
      if (!previousIsLocked) {
        // BLOCK ACCESS: Previous match not locked yet
        canEdit = false;
        errorMessage = `Cannot access this match yet. Previous match must be locked first. Wait until ${new Date(previousMatch.match_start).toLocaleString()}.`;
      } else {
        // Previous match is LOCKED - get its lineup for auto-prefill
        const previousLineup = await getPlayingXIData(client, teamId, previousMatch.id);
        
        if (previousLineup.length === 0) {
          // Previous match locked but no lineup saved
          // This means user never set up Match N, so can't proceed to Match N+1
          canEdit = false;
          errorMessage = `Cannot access this match. Previous match has no saved lineup.`;
        } else if (currentLineup.length === 0) {
          // AUTO-SAVE: Copy previous locked lineup to current match
          // This ensures sequential flow and rolling baseline
          
          await client.query('BEGIN');
          
          try {
            // Delete any existing lineup for this match (shouldn't exist, but safety)
            await client.query(
              'DELETE FROM team_playing_xi WHERE team_id = $1 AND match_id = $2',
              [teamId, matchId]
            );
            
            // Auto-save previous lineup to current match
            for (const player of previousLineup) {
              await client.query(
                `INSERT INTO team_playing_xi 
                 (team_id, league_id, match_id, player_id, player_name, player_role, squad_name, is_captain, is_vice_captain)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                  teamId,
                  match.league_id,
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
            
            await client.query('COMMIT');
            
            // Now fetch the auto-saved lineup
            currentLineup = await getPlayingXIData(client, teamId, matchId);
            currentLineup = currentLineup.map(p => ({
              ...p,
              autoPrefilled: true
            }));
            
          } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error auto-saving lineup:', err);
            canEdit = false;
            errorMessage = 'Failed to auto-save lineup from previous match.';
          }
        }
      }
    }
    
    // Calculate current transfer usage
    let transferStats = {
      transfersUsed: 0,
      transfersRemaining: match.transfer_limit,
      transferLimit: match.transfer_limit
    };
    
    if (previousMatch) {
      const previousLineup = await getPlayingXIData(client, teamId, previousMatch.id);
      
      // Count all transfers from all matches after first
      const allMatches = await client.query(
        `SELECT DISTINCT match_id
         FROM team_playing_xi
         WHERE team_id = $1
         ORDER BY match_id`,
        [teamId]
      );
      
      let totalTransfers = 0;
      
      for (let i = 1; i < allMatches.rows.length; i++) {
        const prevMatchId = allMatches.rows[i - 1].match_id;
        const currMatchId = allMatches.rows[i].match_id;
        
        const prevLineup = await getPlayingXIData(client, teamId, prevMatchId);
        const currLineup = await getPlayingXIData(client, teamId, currMatchId);
        
        const { transfersUsed } = calculateTransfers(prevLineup, currLineup);
        const captainChanges = calculateCaptainChanges(prevLineup, currLineup);
        
        totalTransfers += transfersUsed + captainChanges.captainCost + captainChanges.vcCost;
      }
      
      transferStats.transfersUsed = totalTransfers;
      transferStats.transfersRemaining = match.transfer_limit - totalTransfers;
    }
    
    res.json({
      success: true,
      data: {
        lineup: currentLineup,
        match: {
          id: match.id,
          leagueId: match.league_id,
          startTime: match.match_start,
          isCompleted: match.is_completed,
          isLocked
        },
        canEdit,
        errorMessage,
        transferStats,
        previousMatchId: previousMatch?.id || null
      }
    });
    
  } catch (error) {
    console.error('Error fetching Playing XI:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Playing XI'
    });
  } finally {
    client.release();
  }
};

/**
 * POST /api/playing-xi
 * Save Playing XI with sequential validation and transfer counting
 * 
 * Body: {
 *   teamId, matchId, leagueId,
 *   squad: [{ playerId, playerName, playerRole, squadName }],
 *   captain, viceCaptain
 * }
 */
export const savePlayingXI = async (req, res) => {
  const { teamId, matchId, leagueId, squad, captain, viceCaptain } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // ===== VALIDATION =====
    
    // 1. Validate input
    if (!squad || squad.length !== 11) {
      return res.status(400).json({
        success: false,
        error: 'Exactly 11 players required'
      });
    }
    
    if (!captain || !viceCaptain) {
      return res.status(400).json({
        success: false,
        error: 'Captain and Vice-Captain required'
      });
    }
    
    if (String(captain) === String(viceCaptain)) {
      return res.status(400).json({
        success: false,
        error: 'Captain and Vice-Captain must be different players'
      });
    }
    
    // 2. Get match info
    const matchResult = await client.query(
      `SELECT m.id, m.league_id, m.match_start, m.is_completed,
              l.transfer_limit
       FROM league_matches m
       JOIN fantasy_leagues l ON m.league_id = l.id
       WHERE m.id = $1 AND m.league_id = $2`,
      [matchId, leagueId]
    );
    
    if (matchResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }
    
    const match = matchResult.rows[0];
    const isLocked = new Date() >= new Date(match.match_start);
    
    // 3. Check if match is locked
    if (isLocked) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Cannot save Playing XI - match deadline has passed'
      });
    }
    
    // 4. Get previous match and validate sequential unlocking
    const previousMatch = await getPreviousMatch(client, leagueId, matchId);
    
    if (previousMatch) {
      // REQUIREMENT: Cannot save Match N+1 until Match N is LOCKED (deadline passed)
      const previousIsLocked = new Date() >= new Date(previousMatch.match_start);
      
      if (!previousIsLocked) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: `Cannot save Playing XI - previous match must be locked first. Wait until ${new Date(previousMatch.match_start).toLocaleString()}`
        });
      }
      
      // Note: Previous lineup check not needed here since getPlayingXI auto-saves it
    }
    
    // ===== TRANSFER CALCULATION =====
    
    // Get previous lineup (from previous match, not baseline)
    const previousLineup = previousMatch 
      ? await getPlayingXIData(client, teamId, previousMatch.id)
      : [];
    
    // Prepare current lineup for comparison
    const currentLineup = squad.map(p => ({
      player_id: String(p.playerId),
      player_name: p.playerName,
      player_role: p.playerRole,
      squad_name: p.squadName,
      is_captain: String(p.playerId) === String(captain),
      is_vice_captain: String(p.playerId) === String(viceCaptain)
    }));
    
    // Calculate player transfers
    const { transfersUsed, playersAdded, playersRemoved } = calculateTransfers(previousLineup, currentLineup);
    
    // Calculate captain/VC changes
    const { 
      captainCost, 
      vcCost
    } = calculateCaptainChanges(previousLineup, currentLineup);
    
    const totalTransfersThisMatch = transfersUsed + captainCost + vcCost;
    
    // Calculate total transfers used so far (from all previous matches)
    const allMatches = await client.query(
      `SELECT DISTINCT match_id
       FROM team_playing_xi
       WHERE team_id = $1 AND match_id < $2
       ORDER BY match_id`,
      [teamId, matchId]
    );
    
    let previousTotalTransfers = 0;
    
    for (let i = 1; i < allMatches.rows.length; i++) {
      const prevMatchId = allMatches.rows[i - 1].match_id;
      const currMatchId = allMatches.rows[i].match_id;
      
      const prevLineup = await getPlayingXIData(client, teamId, prevMatchId);
      const currLineup = await getPlayingXIData(client, teamId, currMatchId);
      
      const { transfersUsed: prevTransfers } = calculateTransfers(prevLineup, currLineup);
      const prevCaptainChanges = calculateCaptainChanges(prevLineup, currLineup);
      
      previousTotalTransfers += prevTransfers + prevCaptainChanges.captainCost + prevCaptainChanges.vcCost;
    }
    
    const totalTransfersAfterSave = previousTotalTransfers + totalTransfersThisMatch;
    
    // 5. Check transfer limit
    if (totalTransfersAfterSave > match.transfer_limit) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Transfer limit exceeded. You have ${match.transfer_limit - previousTotalTransfers} transfers remaining, but this change would use ${totalTransfersThisMatch} transfers.`,
        details: {
          transferLimit: match.transfer_limit,
          transfersUsedBefore: previousTotalTransfers,
          transfersThisMatch: totalTransfersThisMatch,
          transfersRemaining: match.transfer_limit - previousTotalTransfers,
          playersAdded,
          playersRemoved,
          captainChangeCost: captainCost,
          vcChangeCost: vcCost
        }
      });
    }
    
    // ===== SAVE TO DATABASE =====
    
    // Delete existing lineup for this match (if re-saving)
    await client.query(
      'DELETE FROM team_playing_xi WHERE team_id = $1 AND match_id = $2',
      [teamId, matchId]
    );
    
    // Insert new lineup
    for (const player of currentLineup) {
      await client.query(
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
    
    await client.query('COMMIT');
    
    // Return success with transfer stats
    res.json({
      success: true,
      message: 'Playing XI saved successfully',
      data: {
        matchId,
        transfersThisMatch: totalTransfersThisMatch,
        transfersUsedTotal: totalTransfersAfterSave,
        transfersRemaining: match.transfer_limit - totalTransfersAfterSave,
        transferLimit: match.transfer_limit,
        details: {
          playerTransfers: transfersUsed,
          captainChangeCost: captainCost,
          vcChangeCost: vcCost,
          playersAdded,
          playersRemoved
        }
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving Playing XI:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save Playing XI',
      details: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/playing-xi/:teamId/:matchId
 * Delete Playing XI (only if match hasn't started)
 */
export const deletePlayingXI = async (req, res) => {
  const { teamId, matchId } = req.params;
  
  const client = await pool.connect();
  
  try {
    // Check if match is locked
    const matchResult = await client.query(
      `SELECT match_start FROM league_matches WHERE id = $1`,
      [matchId]
    );
    
    if (matchResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }
    
    const isLocked = new Date() >= new Date(matchResult.rows[0].match_start);
    
    if (isLocked) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete Playing XI - match has already started'
      });
    }
    
    // Delete the lineup
    const result = await client.query(
      'DELETE FROM team_playing_xi WHERE team_id = $1 AND match_id = $2',
      [teamId, matchId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'No Playing XI found for this match'
      });
    }
    
    res.json({
      success: true,
      message: 'Playing XI deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting Playing XI:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete Playing XI'
    });
  } finally {
    client.release();
  }
};

/**
 * GET /api/transfer-stats/:teamId
 * Get transfer statistics for a team
 */
export const getTransferStats = async (req, res) => {
  const { teamId } = req.params;
  
  const client = await pool.connect();
  
  try {
    // Get team's league and transfer limit
    const teamResult = await client.query(
      `SELECT ft.id, ft.league_id, l.transfer_limit
       FROM fantasy_teams ft
       JOIN fantasy_leagues l ON ft.league_id = l.id
       WHERE ft.id = $1`,
      [teamId]
    );
    
    if (teamResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }
    
    const team = teamResult.rows[0];
    
    // Get all matches where team has saved lineups
    const matchesResult = await client.query(
      `SELECT DISTINCT match_id
       FROM team_playing_xi
       WHERE team_id = $1
       ORDER BY match_id`,
      [teamId]
    );
    
    let totalTransfers = 0;
    
    // Calculate transfers for each match (comparing with previous)
    for (let i = 1; i < matchesResult.rows.length; i++) {
      const prevMatchId = matchesResult.rows[i - 1].match_id;
      const currMatchId = matchesResult.rows[i].match_id;
      
      const prevLineup = await getPlayingXIData(client, teamId, prevMatchId);
      const currLineup = await getPlayingXIData(client, teamId, currMatchId);
      
      const { transfersUsed } = calculateTransfers(prevLineup, currLineup);
      const captainChanges = calculateCaptainChanges(prevLineup, currLineup);
      
      totalTransfers += transfersUsed + captainChanges.captainCost + captainChanges.vcCost;
    }
    
    const transfersRemaining = team.transfer_limit - totalTransfers;
    
    res.json({
      success: true,
      data: {
        transfersUsed: totalTransfers,
        transfersRemaining: Math.max(0, transfersRemaining), // Never show negative
        transferLimit: team.transfer_limit,
        transfersLocked: transfersRemaining <= 0 // Flag when depleted
      }
    });
    
  } catch (error) {
    console.error('Error fetching transfer stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transfer stats'
    });
  } finally {
    client.release();
  }
};
