import pool from '../../config/database.js';

/**
 * Get fantasy points for all players in a specific match for a league
 * Shows which league teams selected each player and their fantasy points
 */
export const getMatchFantasyPoints = async (req, res) => {
  const { leagueId, matchId } = req.params;

  try {
    // Get all players selected in this league with their fantasy points for the specific match
    const query = `
      SELECT 
        fs.player_id,
        fs.player_name,
        fs.squad_name as cricket_team,
        ft.team_name,
        ft.team_owner,
        ft.id as team_id,
        COALESCE(
          (
            SELECT 
              -- Batting points
              COALESCE(pbs.runs, 0) + 
              CASE 
                WHEN COALESCE(pbs.runs, 0) >= 50 AND COALESCE(pbs.runs, 0) < 100 THEN 50
                WHEN COALESCE(pbs.runs, 0) >= 100 THEN 100
                ELSE 0
              END +
              (COALESCE(pbs.fours, 0) * 1) +
              (COALESCE(pbs.sixes, 0) * 2) +
              CASE 
                WHEN COALESCE(pbs.balls_faced, 0) > 0 AND 
                     (CAST(pbs.runs AS FLOAT) / NULLIF(pbs.balls_faced, 0)) >= 1.5 
                THEN 20
                ELSE 0
              END +
              -- Bowling points
              COALESCE((
                SELECT 
                  (COALESCE(pbw.wickets, 0) * 25) +
                  CASE 
                    WHEN COALESCE(pbw.wickets, 0) >= 3 AND COALESCE(pbw.wickets, 0) < 5 THEN 50
                    WHEN COALESCE(pbw.wickets, 0) >= 5 THEN 100
                    ELSE 0
                  END +
                  CASE 
                    WHEN pbw.overs IS NOT NULL AND pbw.overs != '0' AND 
                         pbw.economy IS NOT NULL AND pbw.economy < 4 
                    THEN 30
                    ELSE 0
                  END
                FROM player_bowling_stats pbw
                WHERE pbw.match_id = $2::integer
                  AND pbw.player_name = fs.player_name
                LIMIT 1
              ), 0) +
              -- Fielding points
              COALESCE((
                SELECT 
                  (COALESCE(pfs.catches, 0) * 10) +
                  (COALESCE(pfs.stumpings, 0) * 10) +
                  (COALESCE(pfs.runouts_direct, 0) * 10) +
                  (COALESCE(pfs.runouts_indirect, 0) * 10)
                FROM player_fielding_stats pfs
                WHERE pfs.match_id = $2::integer
                  AND pfs.player_name = fs.player_name
                LIMIT 1
              ), 0)
            FROM player_batting_stats pbs
            WHERE pbs.match_id = $2::integer
              AND pbs.player_name = fs.player_name
            LIMIT 1
          ), 0
        ) as fantasy_points
      FROM fantasy_squads fs
      INNER JOIN fantasy_teams ft ON fs.team_id = ft.id
      WHERE fs.league_id = $1
      GROUP BY fs.player_id, fs.player_name, fs.squad_name, ft.team_name, ft.team_owner, ft.id
      ORDER BY fantasy_points DESC, fs.player_name ASC
    `;

    const result = await pool.query(query, [leagueId, matchId]);

    // Group players by player_id (since same player can be in multiple teams)
    const playerMap = {};
    
    result.rows.forEach(row => {
      const playerId = row.player_id;
      
      if (!playerMap[playerId]) {
        playerMap[playerId] = {
          player_id: playerId,
          player_name: row.player_name,
          cricket_team: row.cricket_team,
          fantasy_points: parseFloat(row.fantasy_points) || 0,
          teams: []
        };
      }
      
      // Add team info
      playerMap[playerId].teams.push({
        team_id: row.team_id,
        team_name: row.team_name,
        team_owner: row.team_owner
      });
    });

    // Convert map to array
    const players = Object.values(playerMap);

    res.json({
      success: true,
      data: {
        match_id: matchId,
        league_id: leagueId,
        players: players
      }
    });
  } catch (error) {
    console.error('Error fetching match fantasy points:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match fantasy points'
    });
  }
};
