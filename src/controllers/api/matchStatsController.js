import pool from '../../config/database.js';

/**
 * ============================================================================
 * MATCH STATS CONTROLLER
 * ============================================================================
 * Calculates fantasy points for matches and updates team scores
 */

/**
 * Calculate and update fantasy points for a completed match
 * POST /api/league/:leagueId/match/:matchId/calculate-points
 * 
 * This should be called after a match is completed (manually or via cron job)
 */
export const calculateMatchPoints = async (req, res) => {
  const { leagueId, matchId } = req.params;

  const client = await pool.connect();

  try {
    // Check if match exists and is completed
    const matchCheck = await client.query(
      'SELECT id, match_id AS tournament_match_id, is_completed FROM league_matches WHERE id = $1 AND league_id = $2',
      [matchId, leagueId]
    );

    if (matchCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Match not found in league'
      });
    }

    const match = matchCheck.rows[0];
    const tournamentMatchId = match.tournament_match_id;

    await client.query('BEGIN');

    // Get all teams' Playing XI for this match
    const teamsResult = await client.query(
      `SELECT DISTINCT team_id FROM team_playing_xi WHERE match_id = $1`,
      [matchId]
    );

    const teams = teamsResult.rows;
    const teamScores = [];

    for (const team of teams) {
      const teamId = team.team_id;

      // Get Playing XI with captain/vice-captain info
      const playingXIResult = await client.query(
        `SELECT player_id, is_captain, is_vice_captain 
         FROM team_playing_xi 
         WHERE team_id = $1 AND match_id = $2`,
        [teamId, matchId]
      );

      const playingXI = playingXIResult.rows;

      if (playingXI.length === 0) {
        console.warn(`Team ${teamId} has no Playing XI for match ${matchId}`);
        continue;
      }

      let totalPoints = 0;
      let captainPoints = 0;
      let viceCaptainPoints = 0;
      let regularPoints = 0;

      // Calculate points for each player
      for (const player of playingXI) {
        const playerPoints = await calculatePlayerFantasyPoints(client, player.player_id, tournamentMatchId);

        if (player.is_captain) {
          // Captain gets 2x points
          captainPoints = playerPoints * 2;
          totalPoints += captainPoints;
        } else if (player.is_vice_captain) {
          // Vice-captain gets 1.5x points
          viceCaptainPoints = Math.floor(playerPoints * 1.5);
          totalPoints += viceCaptainPoints;
        } else {
          // Regular player gets 1x points
          regularPoints += playerPoints;
          totalPoints += playerPoints;
        }
      }

      // Insert or update team_match_scores
      await client.query(
        `INSERT INTO team_match_scores 
          (team_id, league_id, match_id, total_points, captain_points, vice_captain_points, regular_points)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (team_id, match_id) 
         DO UPDATE SET 
           total_points = $4,
           captain_points = $5,
           vice_captain_points = $6,
           regular_points = $7,
           updated_at = NOW()`,
        [teamId, leagueId, matchId, totalPoints, captainPoints, viceCaptainPoints, regularPoints]
      );

      teamScores.push({
        teamId,
        totalPoints,
        captainPoints,
        viceCaptainPoints,
        regularPoints
      });
    }

    // Calculate ranks for this match
    await calculateMatchRanks(client, matchId);

    // Mark match as completed
    await client.query(
      'UPDATE league_matches SET is_completed = true, is_active = false WHERE id = $1',
      [matchId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Match points calculated successfully',
      data: {
        matchId,
        teamsProcessed: teamScores.length,
        teamScores
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error calculating match points:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate match points',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Helper function to calculate fantasy points for a single player in a match
 */
async function calculatePlayerFantasyPoints(client, playerId, matchId) {
  let totalPoints = 0;

  try {
    // Batting points
    const battingResult = await client.query(
      `SELECT 
        runs_scored,
        fours,
        sixes,
        strike_rate
      FROM player_batting_stats
      WHERE player_id::text = $1 AND match_id = $2`,
      [playerId, matchId]
    );

    if (battingResult.rows.length > 0) {
      const batting = battingResult.rows[0];
      
      // Runs
      totalPoints += batting.runs_scored || 0;
      
      // Boundaries
      totalPoints += (batting.fours || 0) * 1;
      totalPoints += (batting.sixes || 0) * 2;
      
      // Milestone bonuses
      if (batting.runs_scored >= 100) {
        totalPoints += 100;
      } else if (batting.runs_scored >= 50) {
        totalPoints += 50;
      }
      
      // Strike rate bonus (if faced at least 10 balls)
      if (batting.strike_rate && batting.strike_rate >= 150) {
        totalPoints += 20;
      }
    }

    // Bowling points
    const bowlingResult = await client.query(
      `SELECT 
        wickets,
        economy
      FROM player_bowling_stats
      WHERE player_id::text = $1 AND match_id = $2`,
      [playerId, matchId]
    );

    if (bowlingResult.rows.length > 0) {
      const bowling = bowlingResult.rows[0];
      
      // Wickets
      totalPoints += (bowling.wickets || 0) * 25;
      
      // Wicket milestone bonuses
      if (bowling.wickets >= 5) {
        totalPoints += 100;
      } else if (bowling.wickets >= 3) {
        totalPoints += 50;
      }
      
      // Economy bonus (if bowled at least 2 overs)
      if (bowling.economy && bowling.economy < 4) {
        totalPoints += 30;
      }
    }

    // Fielding points
    const fieldingResult = await client.query(
      `SELECT 
        catches,
        stumpings,
        runouts_direct,
        runouts_indirect
      FROM player_fielding_stats
      WHERE player_id::text = $1 AND match_id = $2`,
      [playerId, matchId]
    );

    if (fieldingResult.rows.length > 0) {
      const fielding = fieldingResult.rows[0];
      
      totalPoints += (fielding.catches || 0) * 10;
      totalPoints += (fielding.stumpings || 0) * 10;
      totalPoints += ((fielding.runouts_direct || 0) + (fielding.runouts_indirect || 0)) * 10;
    }

  } catch (error) {
    console.error(`Error calculating points for player ${playerId} in match ${matchId}:`, error);
    // Return 0 points on error instead of failing
    return 0;
  }

  return totalPoints;
}

/**
 * Helper function to calculate ranks within a match
 */
async function calculateMatchRanks(client, matchId) {
  await client.query(
    `UPDATE team_match_scores
     SET rank_in_match = subquery.rank
     FROM (
       SELECT 
         id,
         RANK() OVER (PARTITION BY match_id ORDER BY total_points DESC) AS rank
       FROM team_match_scores
       WHERE match_id = $1
     ) AS subquery
     WHERE team_match_scores.id = subquery.id`,
    [matchId]
  );
}

/**
 * Get fantasy points breakdown for a team in a match
 * GET /api/league/:leagueId/team/:teamId/match/:matchId/points-breakdown
 */
export const getTeamMatchPointsBreakdown = async (req, res) => {
  const { leagueId, teamId, matchId } = req.params;

  try {
    // Get team's Playing XI for this match
    const playingXIResult = await pool.query(
      `SELECT 
        tpxi.player_id,
        tpxi.player_name,
        tpxi.player_role,
        tpxi.squad_name,
        tpxi.is_captain,
        tpxi.is_vice_captain
      FROM team_playing_xi tpxi
      WHERE tpxi.team_id = $1 AND tpxi.match_id = $2`,
      [teamId, matchId]
    );

    if (playingXIResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No Playing XI found for this match'
      });
    }

    const match = await pool.query(
      'SELECT tournament_match_id FROM league_matches WHERE id = $1',
      [matchId]
    );

    const tournamentMatchId = match.rows[0]?.tournament_match_id;

    // Calculate points for each player
    const playerBreakdown = [];

    for (const player of playingXIResult.rows) {
      const client = await pool.connect();
      const basePoints = await calculatePlayerFantasyPoints(client, player.player_id, tournamentMatchId);
      client.release();

      let finalPoints = basePoints;
      let multiplier = 1;

      if (player.is_captain) {
        multiplier = 2;
        finalPoints = basePoints * 2;
      } else if (player.is_vice_captain) {
        multiplier = 1.5;
        finalPoints = Math.floor(basePoints * 1.5);
      }

      playerBreakdown.push({
        playerId: player.player_id,
        playerName: player.player_name,
        role: player.player_role,
        squadName: player.squad_name,
        isCaptain: player.is_captain,
        isViceCaptain: player.is_vice_captain,
        basePoints,
        multiplier,
        finalPoints
      });
    }

    // Get team total score
    const scoreResult = await pool.query(
      `SELECT total_points, rank_in_match, captain_points, vice_captain_points, regular_points
       FROM team_match_scores
       WHERE team_id = $1 AND match_id = $2`,
      [teamId, matchId]
    );

    const teamScore = scoreResult.rows[0] || {
      total_points: playerBreakdown.reduce((sum, p) => sum + p.finalPoints, 0),
      rank_in_match: null,
      captain_points: 0,
      vice_captain_points: 0,
      regular_points: 0
    };

    res.json({
      success: true,
      data: {
        teamId,
        matchId,
        players: playerBreakdown,
        teamTotal: teamScore.total_points,
        rank: teamScore.rank_in_match,
        captainPoints: teamScore.captain_points,
        viceCaptainPoints: teamScore.vice_captain_points,
        regularPoints: teamScore.regular_points
      }
    });

  } catch (error) {
    console.error('Error fetching points breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch points breakdown',
      error: error.message
    });
  }
};

/**
 * Recalculate all match points for a league (admin function)
 * POST /api/league/:leagueId/recalculate-all-points
 */
export const recalculateAllPoints = async (req, res) => {
  const { leagueId } = req.params;

  try {
    // Get all matches that have player stats available (regardless of is_completed status)
    const matchesQuery = `
      SELECT DISTINCT league_matches.id AS league_match_id, league_matches.match_id, league_matches.match_description, league_matches.match_start
      FROM league_matches
      WHERE league_matches.league_id = $1
        AND EXISTS (
          SELECT 1 FROM player_batting_stats
          WHERE player_batting_stats.match_id = league_matches.match_id
        )
      ORDER BY league_matches.match_start
    `;
    
    const matchesResult = await pool.query(matchesQuery, [leagueId]);
    const matches = matchesResult.rows;
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const match of matches) {
      try {
        // Get all teams in this league
        const teamsResult = await pool.query(
          'SELECT id FROM fantasy_teams WHERE league_id = $1',
          [leagueId]
        );

        for (const team of teamsResult.rows) {
          const teamId = team.id;

          // Get playing XI for this team in this match
          const playingXIResult = await pool.query(
            'SELECT player_id, is_captain, is_vice_captain FROM team_playing_xi WHERE team_id = $1 AND match_id = $2',
            [teamId, match.league_match_id]
          );

          if (playingXIResult.rows.length === 0) continue;

          // Calculate points for each player
          let totalPoints = 0;
          let captainPoints = 0;
          let viceCaptainPoints = 0;
          let regularPoints = 0;

          for (const player of playingXIResult.rows) {
            const playerId = player.player_id;
            let playerPoints = 0;

            // Batting stats
            const battingResult = await pool.query(
              'SELECT runs, fours, sixes, strike_rate FROM player_batting_stats WHERE player_id = $1 AND match_id = $2',
              [playerId, match.match_id]
            );
            if (battingResult.rows.length > 0) {
              const batting = battingResult.rows[0];
              playerPoints += batting.runs || 0;
              playerPoints += (batting.fours || 0) * 1;
              playerPoints += (batting.sixes || 0) * 2;
              if (batting.strike_rate > 150 && batting.runs >= 30) playerPoints += 6;
            }

            // Bowling stats
            const bowlingResult = await pool.query(
              'SELECT wickets, economy FROM player_bowling_stats WHERE player_id = $1 AND match_id = $2',
              [playerId, match.match_id]
            );
            if (bowlingResult.rows.length > 0) {
              const bowling = bowlingResult.rows[0];
              playerPoints += (bowling.wickets || 0) * 25;
              if (bowling.economy < 5 && bowling.wickets >= 2) playerPoints += 6;
            }

            // Fielding stats
            const fieldingResult = await pool.query(
              'SELECT catches, stumpings, runouts_direct, runouts_indirect FROM player_fielding_stats WHERE player_id = $1 AND match_id = $2',
              [playerId, match.match_id]
            );
            if (fieldingResult.rows.length > 0) {
              const fielding = fieldingResult.rows[0];
              playerPoints += (fielding.catches || 0) * 8;
              playerPoints += (fielding.stumpings || 0) * 12;
              playerPoints += (fielding.runouts_direct || 0) * 12;
              playerPoints += (fielding.runouts_indirect || 0) * 6;
            }

            // Apply multipliers
            if (player.is_captain) {
              captainPoints += playerPoints * 2;
              totalPoints += playerPoints * 2;
            } else if (player.is_vice_captain) {
              viceCaptainPoints += playerPoints * 1.5;
              totalPoints += playerPoints * 1.5;
            } else {
              regularPoints += playerPoints;
              totalPoints += playerPoints;
            }
          }

          // Insert or update team_match_scores (using match_id which is league_match_id in table)
          await pool.query(
            `INSERT INTO team_match_scores (team_id, match_id, league_id, total_points, captain_points, vice_captain_points, regular_points)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (team_id, match_id) 
             DO UPDATE SET total_points = $4, captain_points = $5, vice_captain_points = $6, regular_points = $7`,
            [teamId, match.league_match_id, leagueId, Math.round(totalPoints), Math.round(captainPoints), Math.round(viceCaptainPoints), Math.round(regularPoints)]
          );
        }

        successCount++;
        results.push({
          matchId: match.league_match_id,
          matchDescription: match.match_description,
          success: true
        });

      } catch (err) {
        console.error(`Error recalculating match ${match.league_match_id}:`, err);
        errorCount++;
        results.push({
          matchId: match.league_match_id,
          matchDescription: match.match_description,
          success: false,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      message: `Recalculation completed: ${successCount} matches processed successfully, ${errorCount} errors`,
      data: {
        totalMatches: matches.length,
        successCount,
        errorCount,
        results
      }
    });

  } catch (error) {
    console.error('Error recalculating points:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate points',
      error: error.message
    });
  }
};
