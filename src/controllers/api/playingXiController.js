import pool from '../../config/database.js';

/**
 * ============================================================================
 * PLAYING XI CONTROLLER
 * ============================================================================
 * Handles match-wise Playing XI selection, saving, and retrieval
 */

/**
 * Get Playing XI for a specific match and team
 * GET /api/league/:leagueId/team/:teamId/match/:matchId/playing-xi
 */
export const getPlayingXI = async (req, res) => {
  const { leagueId, teamId, matchId } = req.params;

  try {
    // Validate match belongs to league
    const matchCheck = await pool.query(
      'SELECT id, match_start, is_completed FROM league_matches WHERE id = $1 AND league_id = $2',
      [matchId, leagueId]
    );

    if (matchCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Match not found in this league'
      });
    }

    const match = matchCheck.rows[0];

    // Get Playing XI
    const result = await pool.query(
      `SELECT 
        id, player_id, player_name, player_role, squad_name,
        is_captain, is_vice_captain, created_at, updated_at
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

    // Check if deadline has passed
    const isLocked = new Date() >= new Date(match.match_start);

    res.json({
      success: true,
      data: {
        players: result.rows,
        count: result.rows.length,
        isLocked,
        isCompleted: match.is_completed,
        matchStart: match.match_start
      }
    });
  } catch (error) {
    console.error('Error fetching Playing XI:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Playing XI',
      error: error.message
    });
  }
};

/**
 * Save/Update Playing XI for a specific match
 * POST /api/league/:leagueId/team/:teamId/match/:matchId/playing-xi
 * 
 * Body: {
 *   players: [{ player_id, player_name, player_role, squad_name }],
 *   captainId: "13866",
 *   viceCaptainId: "13867"
 * }
 */
export const savePlayingXI = async (req, res) => {
  const { leagueId, teamId, matchId } = req.params;
  const { players, captainId, viceCaptainId } = req.body;

  const client = await pool.connect();

  try {
    // Validation
    if (!players || !Array.isArray(players) || players.length !== 11) {
      return res.status(400).json({
        success: false,
        message: 'Exactly 11 players required for Playing XI'
      });
    }

    if (!captainId || !viceCaptainId) {
      return res.status(400).json({
        success: false,
        message: 'Captain and Vice-Captain are required'
      });
    }

    if (captainId === viceCaptainId) {
      return res.status(400).json({
        success: false,
        message: 'Captain and Vice-Captain must be different players'
      });
    }

    // Check if match belongs to league
    const matchCheck = await client.query(
      'SELECT id, match_start, is_completed FROM league_matches WHERE id = $1 AND league_id = $2',
      [matchId, leagueId]
    );

    if (matchCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Match not found in this league'
      });
    }

    const match = matchCheck.rows[0];

    // Check deadline - can't update after match starts
    if (new Date() >= new Date(match.match_start)) {
      return res.status(403).json({
        success: false,
        message: 'Deadline passed. Cannot update Playing XI after match starts'
      });
    }

    if (match.is_completed) {
      return res.status(403).json({
        success: false,
        message: 'Match already completed. Cannot update Playing XI'
      });
    }

    // CRITICAL: Check if there are ANY future matches with saved Playing XI
    // This prevents editing past matches that would invalidate future lineups
    const futureMatchesWithXI = await client.query(
      `SELECT lm.id, lm.match_start
       FROM league_matches lm
       JOIN team_playing_xi tpxi ON tpxi.match_id = lm.id AND tpxi.team_id = $1
       WHERE lm.league_id = $2 
         AND lm.id > $3
       ORDER BY lm.match_start ASC
       LIMIT 1`,
      [teamId, leagueId, matchId]
    );

    if (futureMatchesWithXI.rows.length > 0) {
      return res.status(403).json({
        success: false,
        message: `Cannot edit this match. You have already set Playing XI for future matches. Please delete future lineups first if you want to edit past matches.`,
        futureMatch: futureMatchesWithXI.rows[0].id
      });
    }

    // Validate all players are in team's squad
    const squadCheck = await client.query(
      `SELECT player_id FROM fantasy_squads 
       WHERE team_id = $1 AND league_id = $2`,
      [teamId, leagueId]
    );

    // Convert all player_ids to strings for consistent comparison
    const squadPlayerIds = squadCheck.rows.map(r => String(r.player_id));
    const invalidPlayers = players.filter(p => !squadPlayerIds.includes(String(p.player_id)));

    if (invalidPlayers.length > 0) {
      console.log('❌ Validation failed:');
      console.log('Squad player IDs:', squadPlayerIds);
      console.log('Submitted player IDs:', players.map(p => String(p.player_id)));
      console.log('Invalid players:', invalidPlayers.map(p => p.player_name));
      return res.status(400).json({
        success: false,
        message: 'Some players are not in your squad',
        invalidPlayers: invalidPlayers.map(p => p.player_name)
      });
    }

    // Validate captain and vice-captain are in playing XI
    // Convert to strings for consistent comparison
    const playerIds = players.map(p => String(p.player_id));
    if (!playerIds.includes(String(captainId))) {
      return res.status(400).json({
        success: false,
        message: 'Captain must be in Playing XI'
      });
    }
    if (!playerIds.includes(String(viceCaptainId))) {
      return res.status(400).json({
        success: false,
        message: 'Vice-Captain must be in Playing XI'
      });
    }

    // Validate role requirements
    const roleCount = {
      wicketkeeper: 0,
      batsman: 0,
      allrounder: 0,
      bowler: 0
    };

    let totalOvers = 0;

    players.forEach(player => {
      const role = player.player_role.toLowerCase();
      
      if (role.includes('wicket') || role.includes('wk')) {
        roleCount.wicketkeeper++;
      } else if (role.includes('bowl') && role.includes('allrounder')) {
        roleCount.allrounder++;
        totalOvers += 4; // Bowling all-rounder = 4 overs
      } else if (role.includes('bat') && role.includes('allrounder')) {
        roleCount.allrounder++;
        totalOvers += 2; // Batting all-rounder = 2 overs
      } else if (role.includes('bowl')) {
        roleCount.bowler++;
        totalOvers += 4;
      } else if (role.includes('bat')) {
        roleCount.batsman++;
      }
    });

    // Minimum 1 wicketkeeper
    if (roleCount.wicketkeeper < 1) {
      return res.status(400).json({
        success: false,
        message: 'Minimum 1 Wicketkeeper required'
      });
    }

    // Minimum 20 overs bowling quota
    if (totalOvers < 20) {
      return res.status(400).json({
        success: false,
        message: `Minimum 20 overs required. You have ${totalOvers} overs.`
      });
    }

    // Start transaction
    await client.query('BEGIN');

    // Get first match to check if this is Match 1
    const firstMatch = await client.query(
      `SELECT id, match_start FROM league_matches 
       WHERE league_id = $1 
       ORDER BY match_start ASC 
       LIMIT 1`,
      [leagueId]
    );

    const isFirstMatch = firstMatch.rows.length > 0 && firstMatch.rows[0].id === parseInt(matchId);

    // Get transfer stats
    const transferStats = await client.query(
      `SELECT ft.transfers_made, ft.captain_changes_made, fl.max_transfers 
       FROM fantasy_teams ft
       JOIN fantasy_leagues fl ON ft.league_id = fl.id
       WHERE ft.id = $1 AND fl.id = $2`,
      [teamId, leagueId]
    );

    const stats = transferStats.rows[0] || { transfers_made: 0, captain_changes_made: 0, max_transfers: 10 };

    // Variables for transfer tracking
    let transfersUsedThisMatch = 0;
    let captainChangesMade = 0;

    if (!isFirstMatch) {
      // Get the most recent LOCKED match (deadline passed) with a saved Playing XI
      // This becomes our baseline instead of always using Match 1
      const baselineMatch = await client.query(
        `SELECT lm.id, lm.match_start
         FROM league_matches lm
         JOIN team_playing_xi tpxi ON tpxi.match_id = lm.id AND tpxi.team_id = $1
         WHERE lm.league_id = $2 
           AND lm.id < $3
           AND NOW() >= lm.match_start
         ORDER BY lm.match_start DESC
         LIMIT 1`,
        [teamId, leagueId, matchId]
      );

      // If no locked match found, fall back to Match 1
      const baselineMatchId = baselineMatch.rows.length > 0 
        ? baselineMatch.rows[0].id 
        : firstMatch.rows[0].id;

      // Get the BASELINE Playing XI from most recent locked match
      const baselineXI = await client.query(
        `SELECT player_id, is_captain, is_vice_captain FROM team_playing_xi 
         WHERE team_id = $1 AND match_id = $2`,
        [teamId, baselineMatchId]
      );

      if (baselineXI.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Please set up your Playing XI for Match ${baselineMatchId === firstMatch.rows[0].id ? '1' : 'previous'} first before making changes.`
        });
      }

      // Get previous Playing XI for this match (if exists) to calculate incremental transfers
      const previousXI = await client.query(
        `SELECT player_id, is_captain, is_vice_captain FROM team_playing_xi 
         WHERE team_id = $1 AND match_id = $2`,
        [teamId, matchId]
      );

      // Compare new lineup with baseline to get current changes
      const baselinePlayerIds = baselineXI.rows.map(p => String(p.player_id)).sort();
      const newPlayerIds = players.map(p => String(p.player_id)).sort();
      
      // Count how many players are different from baseline
      const playersChangedFromBaseline = baselinePlayerIds.filter(id => !newPlayerIds.includes(id));
      const currentTransfersFromBaseline = playersChangedFromBaseline.length;

      // If there was a previous save for this match, calculate what was already counted
      let previousTransfersFromBaseline = 0;
      if (previousXI.rows.length > 0) {
        const previousPlayerIds = previousXI.rows.map(p => String(p.player_id)).sort();
        const previousChangedFromBaseline = baselinePlayerIds.filter(id => !previousPlayerIds.includes(id));
        previousTransfersFromBaseline = previousChangedFromBaseline.length;
      }

      // Calculate the incremental change for this save
      transfersUsedThisMatch = currentTransfersFromBaseline - previousTransfersFromBaseline;

      // Calculate new total
      const newTransfersTotal = stats.transfers_made + transfersUsedThisMatch;

      // Check if transfers exceed limit
      if (newTransfersTotal > stats.max_transfers) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Transfer limit exceeded. You have ${stats.max_transfers - stats.transfers_made} transfers remaining.`,
          transfersRemaining: stats.max_transfers - stats.transfers_made,
          transfersAttempted: newTransfersTotal
        });
      }

      // Check captain/VC changes from baseline
      const baselineCaptain = baselineXI.rows.find(p => p.is_captain);
      const baselineVC = baselineXI.rows.find(p => p.is_vice_captain);
      
      console.log('🔍 Captain Change Debug:', {
        matchId,
        isFirstMatch,
        baselineCaptainId: baselineCaptain?.player_id,
        baselineCaptainIdType: typeof baselineCaptain?.player_id,
        currentCaptainId: captainId,
        currentCaptainIdType: typeof captainId,
        baselineVCId: baselineVC?.player_id,
        currentVCId: viceCaptainId,
        hasPreviousSave: previousXI.rows.length > 0,
        captainChangesUsed: stats.captain_changes_made
      });
      
      // For captain change tracking, we need to compare with:
      // 1. Previous save of THIS match (if exists) - to know current state
      // 2. Baseline (locked match) - to know if there's a NEW change from locked state
      
      let captainChanged = false;
      let vcChanged = false;
      let isNewCaptainChange = false;
      
      if (previousXI.rows.length > 0) {
        // Match was saved before - compare with previous save
        const previousCaptain = previousXI.rows.find(p => p.is_captain);
        const previousVC = previousXI.rows.find(p => p.is_vice_captain);
        
        console.log('📋 Previous Save:', {
          previousCaptainId: previousCaptain?.player_id,
          previousCaptainIdType: typeof previousCaptain?.player_id,
          previousVCId: previousVC?.player_id,
          previousVCIdType: typeof previousVC?.player_id
        });
        
        // Check if user is changing from their previous save (MUST use String() for comparison)
        const prevCaptainStr = String(previousCaptain.player_id);
        const currentCaptainStr = String(captainId);
        captainChanged = previousCaptain && prevCaptainStr !== currentCaptainStr;
        vcChanged = previousVC && String(previousVC.player_id) !== String(viceCaptainId);
        
        console.log('🔄 Change from Previous Save:', {
          captainChanged,
          vcChanged,
          prevCaptainStr,
          currentCaptainStr,
          areEqual: prevCaptainStr === currentCaptainStr,
          comparison: `'${prevCaptainStr}' !== '${currentCaptainStr}'`
        });
        
        // Check if previous save had a captain change from baseline
        const previousHadCaptainChange = previousCaptain && baselineCaptain && 
          String(previousCaptain.player_id) !== String(baselineCaptain.player_id);
        const previousHadVCChange = previousVC && baselineVC && 
          String(previousVC.player_id) !== String(baselineVC.player_id);
        
        // Check if current save has a captain change from baseline
        const currentHasCaptainChange = baselineCaptain && 
          String(captainId) !== String(baselineCaptain.player_id);
        const currentHasVCChange = baselineVC && 
          String(viceCaptainId) !== String(baselineVC.player_id);
        
        console.log('🎯 Change Analysis:', {
          previousHadCaptainChange,
          previousHadVCChange,
          currentHasCaptainChange,
          currentHasVCChange,
          previousCaptain: previousCaptain?.player_id,
          currentCaptain: captainId,
          baselineCaptain: baselineCaptain?.player_id,
          captainChangesAlreadyUsed: stats.captain_changes_made
        });
        
        // CRITICAL FIX: We need to handle two different scenarios:
        // 1. Re-saving THE SAME match → Can add/remove changes
        // 2. Saving a DIFFERENT match → Can only add if not at limit
        
        // For re-saving same match:
        // - Previous had change, current doesn't → DECREMENT (reverting)
        // - Previous didn't have change, current does → INCREMENT (new change)
        // - Both have OR both don't → NO CHANGE
        
        if (previousHadCaptainChange && !currentHasCaptainChange) {
          // Reverting to baseline
          captainChangesMade = -1;
          console.log('⬅️  Reverting to baseline - will DECREMENT counter');
        } else if (!previousHadCaptainChange && currentHasCaptainChange) {
          // Adding a new change
          captainChangesMade = 1;
          console.log('➡️  New change from baseline - will INCREMENT counter');
        } else if (previousHadCaptainChange && currentHasCaptainChange) {
          // BOTH previous and current differ from baseline
          // Check if they're the SAME non-baseline captain (re-saving) or DIFFERENT (changing again)
          if (String(previousCaptain.player_id) === String(captainId)) {
            // Same captain as before - no change
            captainChangesMade = 0;
            console.log('⏸️  Re-saving same non-baseline captain - no change to counter');
          } else {
            // Different captain - trying to make ANOTHER change
            // This should be BLOCKED if already at limit
            captainChangesMade = 1; // Try to add 1
            console.log('🚫 Attempting to change to DIFFERENT non-baseline captain!');
          }
        } else {
          // Neither had change
          captainChangesMade = 0;
          console.log('⏸️  No change to counter');
        }
      } else {
        // First time saving this match - compare with baseline
        console.log('🆕 First Time Save - Comparing with Baseline');
        
        captainChanged = baselineCaptain && String(baselineCaptain.player_id) !== String(captainId);
        vcChanged = baselineVC && String(baselineVC.player_id) !== String(viceCaptainId);
        
        console.log('🔄 Change from Baseline:', {
          captainChanged,
          vcChanged,
          comparison: `${String(baselineCaptain?.player_id)} !== ${String(captainId)}`
        });
        
        // CRITICAL: Check if this captain/VC was already used in a PREVIOUS match
        // If the user already changed to this captain in Match X, they can freely use it in Match X+1
        // Only changing to a NEW captain (different from both baseline AND previous matches) should count
        
        // Query to check if this captain was used in any previous match after baseline
        // IMPORTANT: Exclude the baseline captain itself!
        const previousCaptainCheckQuery = `
          SELECT DISTINCT player_id 
          FROM team_playing_xi 
          WHERE team_id = $1 
            AND match_id > (
              SELECT COALESCE(MAX(id), 0) 
              FROM league_matches 
              WHERE league_id = $2 AND id < $3 AND NOW() >= match_start
            )
            AND match_id < $3
            AND is_captain = true
            AND player_id != $4
        `;
        const previousCaptainsResult = await client.query(previousCaptainCheckQuery, 
          [teamId, leagueId, matchId, baselineCaptain?.player_id]);
        const previousCaptains = previousCaptainsResult.rows.map(r => String(r.player_id));
        
        // Query for VCs (also exclude baseline VC)
        const previousVCCheckQuery = `
          SELECT DISTINCT player_id 
          FROM team_playing_xi 
          WHERE team_id = $1 
            AND match_id > (
              SELECT COALESCE(MAX(id), 0) 
              FROM league_matches 
              WHERE league_id = $2 AND id < $3 AND NOW() >= match_start
            )
            AND match_id < $3
            AND is_vice_captain = true
            AND player_id != $4
        `;
        const previousVCsResult = await client.query(previousVCCheckQuery, 
          [teamId, leagueId, matchId, baselineVC?.player_id]);
        const previousVCs = previousVCsResult.rows.map(r => String(r.player_id));
        
        const captainWasUsedBefore = previousCaptains.includes(String(captainId));
        const vcWasUsedBefore = previousVCs.includes(String(viceCaptainId));
        
        console.log('🔍 Previous Captain/VC Usage:', {
          previousCaptains,
          previousVCs,
          currentCaptainId: String(captainId),
          currentVCId: String(viceCaptainId),
          captainWasUsedBefore,
          vcWasUsedBefore,
          baselineCaptainId: String(baselineCaptain?.player_id),
          baselineVCId: String(baselineVC?.player_id)
        });
        
        isNewCaptainChange = captainChanged || vcChanged;
        
        // Set captainChangesMade for first-time save
        if (isNewCaptainChange) {
          // Check if this is truly a NEW captain/VC or one already used
          if ((captainChanged && captainWasUsedBefore) || (vcChanged && vcWasUsedBefore)) {
            // Using a captain/VC that was already chosen in a previous match - don't count it again
            captainChangesMade = 0;
            console.log('♻️  Reusing previously changed captain/VC - no additional change');
          } else {
            // This is a brand new captain/VC choice
            captainChangesMade = 1;
            console.log('➡️  First-time save with NEW captain/VC - will INCREMENT counter');
          }
        } else {
          captainChangesMade = 0;
          console.log('⏸️  First-time save, no captain/VC change');
        }
      }

      console.log('🔍 Captain Change Result:', {
        captainChanged,
        vcChanged,
        isNewCaptainChange,
        captainChangesMade,
        currentCaptainChangesUsed: stats.captain_changes_made,
        willBlock: captainChangesMade > 0 && stats.captain_changes_made >= 1
      });

      // Block if trying to ADD a captain change when already at limit
      if (captainChangesMade > 0 && stats.captain_changes_made >= 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'You have already used your one captain/vice-captain change after Match 1.',
          debug: {
            isFirstMatch,
            captainChangesUsed: stats.captain_changes_made,
            tryingToAdd: captainChangesMade
          }
        });
      }

      // Update team stats with INCREMENTAL transfer count
      await client.query(
        `UPDATE fantasy_teams 
         SET transfers_made = transfers_made + $1, 
             captain_changes_made = captain_changes_made + $2
         WHERE id = $3`,
        [transfersUsedThisMatch, captainChangesMade, teamId]
      );

      // Clear previous transfer logs for this match (since we're recalculating)
      await client.query(
        `DELETE FROM playing_xi_transfers WHERE team_id = $1 AND league_id = $2 AND match_id = $3`,
        [teamId, leagueId, matchId]
      );

      // Log current transfer state (what's different from baseline)
      const playersIn = newPlayerIds.filter(id => !baselinePlayerIds.includes(id));
      const playersOut = baselinePlayerIds.filter(id => !newPlayerIds.includes(id));

      for (let i = 0; i < playersOut.length; i++) {
        await client.query(
          `INSERT INTO playing_xi_transfers 
            (team_id, league_id, match_id, transfer_type, player_id, player_name, previous_player_id, previous_player_name)
           VALUES ($1, $2, $3, 'substitution', $4, $5, $6, $7)`,
          [teamId, leagueId, matchId, playersIn[i], 
           players.find(p => String(p.player_id) === playersIn[i])?.player_name,
           playersOut[i], 
           baselineXI.rows.find(p => String(p.player_id) === playersOut[i])?.player_id]
        );
      }

      // Log captain/VC changes if any
      if (captainChanged) {
        await client.query(
          `INSERT INTO playing_xi_transfers 
            (team_id, league_id, match_id, transfer_type, player_id, player_name, previous_player_id, previous_player_name)
           VALUES ($1, $2, $3, 'captain_change', $4, $5, $6, $7)`,
          [teamId, leagueId, matchId, captainId,
           players.find(p => String(p.player_id) === String(captainId))?.player_name,
           baselineCaptain.player_id, 
           players.find(p => String(p.player_id) === String(baselineCaptain.player_id))?.player_name]
        );
      }

      if (vcChanged) {
        await client.query(
          `INSERT INTO playing_xi_transfers 
            (team_id, league_id, match_id, transfer_type, player_id, player_name, previous_player_id, previous_player_name)
           VALUES ($1, $2, $3, 'vice_captain_change', $4, $5, $6, $7)`,
          [teamId, leagueId, matchId, viceCaptainId,
           players.find(p => String(p.player_id) === String(viceCaptainId))?.player_name,
           baselineVC.player_id,
           players.find(p => String(p.player_id) === String(baselineVC.player_id))?.player_name]
        );
      }
    }

    // Delete existing Playing XI for this team-match
    await client.query(
      'DELETE FROM team_playing_xi WHERE team_id = $1 AND match_id = $2',
      [teamId, matchId]
    );

    // Insert new Playing XI
    for (const player of players) {
      // Convert to strings for consistent comparison
      const isCaptain = String(player.player_id) === String(captainId);
      const isViceCaptain = String(player.player_id) === String(viceCaptainId);

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
          isCaptain,
          isViceCaptain
        ]
      );
    }

    // Commit transaction
    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Playing XI saved successfully',
      data: {
        teamId,
        matchId,
        playerCount: players.length,
        captain: players.find(p => String(p.player_id) === String(captainId))?.player_name,
        viceCaptain: players.find(p => String(p.player_id) === String(viceCaptainId))?.player_name,
        transfersUsed: transfersUsedThisMatch,
        captainChangesUsed: captainChangesMade,
        transfersRemaining: stats.max_transfers - (stats.transfers_made + transfersUsedThisMatch),
        captainChangesRemaining: 1 - (stats.captain_changes_made + captainChangesMade),
        isFirstMatch
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving Playing XI:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save Playing XI',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Delete Playing XI for a specific match
 * DELETE /api/league/:leagueId/team/:teamId/match/:matchId/playing-xi
 * 
 * Purpose: Allows users to delete future match lineups so they can edit past matches
 * Restriction: Cannot delete if match deadline has passed
 */
export const deletePlayingXI = async (req, res) => {
  const { leagueId, teamId, matchId } = req.params;

  const client = await pool.connect();

  try {
    // Check if match belongs to league
    const matchCheck = await client.query(
      'SELECT id, match_start, is_completed FROM league_matches WHERE id = $1 AND league_id = $2',
      [matchId, leagueId]
    );

    if (matchCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Match not found in this league'
      });
    }

    const match = matchCheck.rows[0];

    // Check deadline - can't delete after match starts
    if (new Date() >= new Date(match.match_start)) {
      return res.status(403).json({
        success: false,
        message: 'Deadline passed. Cannot delete Playing XI after match starts'
      });
    }

    if (match.is_completed) {
      return res.status(403).json({
        success: false,
        message: 'Match already completed. Cannot delete Playing XI'
      });
    }

    // Check if Playing XI exists
    const existingXI = await client.query(
      'SELECT COUNT(*) as count FROM team_playing_xi WHERE team_id = $1 AND match_id = $2',
      [teamId, matchId]
    );

    if (existingXI.rows[0].count === '0') {
      return res.status(404).json({
        success: false,
        message: 'No Playing XI found for this match'
      });
    }

    // Start transaction
    await client.query('BEGIN');

    // Delete Playing XI
    await client.query(
      'DELETE FROM team_playing_xi WHERE team_id = $1 AND match_id = $2',
      [teamId, matchId]
    );

    // Also delete any transfer logs for this match
    await client.query(
      'DELETE FROM playing_xi_transfers WHERE team_id = $1 AND match_id = $2',
      [teamId, matchId]
    );

    // Commit transaction
    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Playing XI deleted successfully',
      data: {
        teamId,
        matchId
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting Playing XI:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete Playing XI',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Check if a match is locked (deadline passed)
 * GET /api/league/:leagueId/match/:matchId/is-locked
 */
export const checkMatchLock = async (req, res) => {
  const { leagueId, matchId } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        id, match_start, is_active, is_completed,
        CASE 
          WHEN NOW() >= match_start THEN true 
          ELSE false 
        END AS is_locked,
        EXTRACT(EPOCH FROM (match_start - NOW())) AS seconds_until_start
      FROM league_matches
      WHERE id = $1 AND league_id = $2`,
      [matchId, leagueId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    const match = result.rows[0];

    res.json({
      success: true,
      data: {
        matchId: match.id,
        isLocked: match.is_locked,
        isCompleted: match.is_completed,
        matchStart: match.match_start,
        secondsUntilStart: Math.max(0, Math.floor(match.seconds_until_start))
      }
    });

  } catch (error) {
    console.error('Error checking match lock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check match status',
      error: error.message
    });
  }
};

/**
 * Get all matches for a league with Playing XI status
 * GET /api/league/:leagueId/team/:teamId/matches-status
 */
export const getMatchesWithPlayingXIStatus = async (req, res) => {
  const { leagueId, teamId } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        lm.id AS match_id,
        lm.match_id AS tournament_match_id,
        lm.match_start,
        lm.match_description,
        lm.is_active,
        lm.is_completed,
        CASE 
          WHEN NOW() >= lm.match_start THEN true 
          ELSE false 
        END AS is_locked,
        COUNT(tpxi.id) AS playing_xi_count,
        CASE 
          WHEN COUNT(tpxi.id) = 11 THEN true 
          ELSE false 
        END AS has_playing_xi
      FROM league_matches lm
      LEFT JOIN team_playing_xi tpxi ON lm.id = tpxi.match_id AND tpxi.team_id = $1
      WHERE lm.league_id = $2
      GROUP BY lm.id, lm.match_id, lm.match_start, lm.match_description, lm.is_active, lm.is_completed
      ORDER BY lm.match_start ASC`,
      [teamId, leagueId]
    );

    res.json({
      success: true,
      data: {
        matches: result.rows,
        total: result.rows.length,
        pending: result.rows.filter(m => !m.has_playing_xi && !m.is_locked).length,
        locked: result.rows.filter(m => m.is_locked).length,
        completed: result.rows.filter(m => m.is_completed).length
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
 * Copy Playing XI from previous match
 * POST /api/league/:leagueId/team/:teamId/match/:matchId/copy-playing-xi
 * 
 * Body: { fromMatchId: 123 }
 */
export const copyPlayingXI = async (req, res) => {
  const { leagueId, teamId, matchId } = req.params;
  const { fromMatchId } = req.body;

  const client = await pool.connect();

  try {
    if (!fromMatchId) {
      return res.status(400).json({
        success: false,
        message: 'Source match ID required'
      });
    }

    // Check deadline
    const matchCheck = await client.query(
      'SELECT match_start FROM league_matches WHERE id = $1 AND league_id = $2',
      [matchId, leagueId]
    );

    if (matchCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Target match not found'
      });
    }

    if (new Date() >= new Date(matchCheck.rows[0].match_start)) {
      return res.status(403).json({
        success: false,
        message: 'Deadline passed. Cannot copy Playing XI'
      });
    }

    // Get Playing XI from source match
    const sourcePlayers = await client.query(
      `SELECT player_id, player_name, player_role, squad_name, is_captain, is_vice_captain
       FROM team_playing_xi
       WHERE team_id = $1 AND match_id = $2`,
      [teamId, fromMatchId]
    );

    if (sourcePlayers.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No Playing XI found in source match'
      });
    }

    // Start transaction
    await client.query('BEGIN');

    // Delete existing Playing XI for target match
    await client.query(
      'DELETE FROM team_playing_xi WHERE team_id = $1 AND match_id = $2',
      [teamId, matchId]
    );

    // Copy players to target match
    for (const player of sourcePlayers.rows) {
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

    res.json({
      success: true,
      message: 'Playing XI copied successfully',
      data: {
        playersCopied: sourcePlayers.rows.length
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error copying Playing XI:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to copy Playing XI',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get transfer statistics for a team
 * GET /api/league/:leagueId/team/:teamId/transfer-stats
 */
export const getTransferStats = async (req, res) => {
  const { leagueId, teamId } = req.params;

  try {
    // Get league settings (updated to use transfer_limit)
    const leagueSettings = await pool.query(
      `SELECT 
        COALESCE(transfer_limit, max_transfers, 10) as transfer_limit,
        allow_captain_changes 
       FROM fantasy_leagues 
       WHERE id = $1`,
      [leagueId]
    );

    if (leagueSettings.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'League not found'
      });
    }

    const { transfer_limit, allow_captain_changes } = leagueSettings.rows[0];

    // Get team transfer usage (updated to use new columns)
    const teamStats = await pool.query(
      `SELECT 
        captain_free_change_used,
        vice_captain_free_change_used
       FROM fantasy_teams 
       WHERE id = $1`,
      [teamId]
    );

    if (teamStats.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const { captain_free_change_used, vice_captain_free_change_used } = teamStats.rows[0];

    // Calculate transfers used by counting changes from all matches
    // This is a temporary calculation - ideally should be cached
    const transfersUsed = 0; // TODO: Calculate actual transfers used from match-to-match changes

    // Get first match to determine if we're past match 1
    const firstMatch = await pool.query(
      `SELECT id, match_start FROM league_matches 
       WHERE league_id = $1 
       ORDER BY match_start ASC 
       LIMIT 1`,
      [leagueId]
    );

    const isAfterFirstMatch = firstMatch.rows.length > 0 && 
                               new Date() >= new Date(firstMatch.rows[0].match_start);

    res.json({
      success: true,
      data: {
        maxTransfers: transfer_limit,
        transfersUsed: transfersUsed,
        transfersRemaining: transfer_limit - transfersUsed,
        allowCaptainChanges: allow_captain_changes !== false,
        captainFreeChangeUsed: captain_free_change_used || false,
        vcFreeChangeUsed: vice_captain_free_change_used || false,
        captainChangesRemaining: captain_free_change_used ? 0 : 1,
        vcChangesRemaining: vice_captain_free_change_used ? 0 : 1,
        isAfterFirstMatch,
        transfersLocked: false, // Will be calculated properly when transfers are counted
        captainChangesLocked: captain_free_change_used && isAfterFirstMatch
      }
    });

  } catch (error) {
    console.error('Error fetching transfer stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transfer stats',
      error: error.message
    });
  }
};
