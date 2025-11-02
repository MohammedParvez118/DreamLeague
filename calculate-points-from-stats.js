import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Fantasy',
  password: 'P@rvezn00r',
  port: 5432,
});

/**
 * Calculate fantasy points for a player based on their stats
 */
async function calculatePlayerPoints(client, playerId, matchId) {
  let totalPoints = 0;

  try {
    // Batting points
    const battingResult = await client.query(
      `SELECT runs, fours, sixes, strike_rate
       FROM player_batting_stats
       WHERE player_id::text = $1 AND match_id = $2`,
      [playerId, matchId]
    );

    if (battingResult.rows.length > 0) {
      const batting = battingResult.rows[0];
      totalPoints += batting.runs || 0;
      totalPoints += (batting.fours || 0) * 1;
      totalPoints += (batting.sixes || 0) * 2;
      
      if (batting.runs >= 100) totalPoints += 100;
      else if (batting.runs >= 50) totalPoints += 50;
      
      if (batting.strike_rate && batting.strike_rate >= 150) totalPoints += 20;
    }

    // Bowling points
    const bowlingResult = await client.query(
      `SELECT wickets, economy
       FROM player_bowling_stats
       WHERE player_id::text = $1 AND match_id = $2`,
      [playerId, matchId]
    );

    if (bowlingResult.rows.length > 0) {
      const bowling = bowlingResult.rows[0];
      totalPoints += (bowling.wickets || 0) * 25;
      
      if (bowling.wickets >= 5) totalPoints += 100;
      else if (bowling.wickets >= 3) totalPoints += 50;
      
      if (bowling.economy && bowling.economy < 4) totalPoints += 30;
    }

    // Fielding points
    const fieldingResult = await client.query(
      `SELECT catches, stumpings, runouts_direct, runouts_indirect
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
    console.error(`Error calculating points for player ${playerId}:`, error.message);
    return 0;
  }

  return totalPoints;
}

/**
 * Calculate and populate team_match_scores for matches with available stats
 */
async function calculatePointsForMatchesWithStats() {
  const client = await pool.connect();
  
  try {
    console.log('\n=== Calculating Points for Matches with Stats ===\n');

    await client.query('BEGIN');

    // Find matches that have player stats but no team_match_scores
    const matchesQuery = await client.query(`
      SELECT DISTINCT 
        lm.id as league_match_id,
        lm.match_id,
        lm.league_id,
        lm.match_description
      FROM league_matches lm
      WHERE lm.league_id = 84
      AND EXISTS (
        SELECT 1 FROM player_batting_stats pbs 
        WHERE pbs.match_id = lm.match_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM team_match_scores tms 
        WHERE tms.match_id = lm.id
      )
      ORDER BY lm.id
      LIMIT 10
    `);

    console.log(`Found ${matchesQuery.rows.length} matches with stats but no scores calculated\n`);

    for (const match of matchesQuery.rows) {
      console.log(`Processing: ${match.match_description} (ID: ${match.league_match_id})`);

      // Get teams with Playing XI for this match
      const teamsResult = await client.query(
        `SELECT DISTINCT team_id FROM team_playing_xi WHERE match_id = $1`,
        [match.league_match_id]
      );

      for (const team of teamsResult.rows) {
        const teamId = team.team_id;

        // Get Playing XI for this team
        const playingXI = await client.query(
          `SELECT player_id, is_captain, is_vice_captain
           FROM team_playing_xi
           WHERE team_id = $1 AND match_id = $2`,
          [teamId, match.league_match_id]
        );

        if (playingXI.rows.length === 0) continue;

        let totalPoints = 0;
        let captainPoints = 0;
        let viceCaptainPoints = 0;
        let regularPoints = 0;

        // Calculate points for each player
        for (const player of playingXI.rows) {
          const playerPoints = await calculatePlayerPoints(client, player.player_id, match.match_id);

          if (player.is_captain) {
            captainPoints = playerPoints * 2;
            totalPoints += captainPoints;
          } else if (player.is_vice_captain) {
            viceCaptainPoints = Math.floor(playerPoints * 1.5);
            totalPoints += viceCaptainPoints;
          } else {
            regularPoints += playerPoints;
            totalPoints += playerPoints;
          }
        }

        // Insert into team_match_scores
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
          [teamId, match.league_id, match.league_match_id, totalPoints, captainPoints, viceCaptainPoints, regularPoints]
        );

        console.log(`  Team ${teamId}: ${totalPoints} points`);
      }
    }

    await client.query('COMMIT');
    
    console.log('\n✅ Points calculation completed!\n');

    // Show updated leaderboard
    const leaderboard = await client.query(`
      SELECT rank, team_name, total_points, matches_played
      FROM league_leaderboard
      WHERE league_id = 84
      ORDER BY rank
    `);

    console.log('Updated Leaderboard:');
    console.table(leaderboard.rows);

    client.release();
    pool.end();

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    client.release();
    pool.end();
  }
}

calculatePointsForMatchesWithStats();
