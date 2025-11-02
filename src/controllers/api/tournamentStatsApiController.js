import { db } from '../../config/database.js';

const client = db;

/**
 * Get aggregated tournament statistics for all players
 * Calculates batting and bowling stats from match scorecards
 */
export const getTournamentStats = async (req, res) => {
    try {
        const { tournamentId } = req.params;

        // Get all match IDs for this tournament
        // Exclude matches with no result or abandoned status
        const matchesQuery = `
            SELECT match_id 
            FROM matches 
            WHERE series_id = $1
            AND result NOT ILIKE '%no result%'
            AND result NOT ILIKE '%abandon%'
            AND result NOT ILIKE '%match cancelled%'
        `;
        const matchesResult = await client.query(matchesQuery, [tournamentId]);
        
        if (matchesResult.rows.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: 'No matches found for this tournament'
            });
        }

        const matchIds = matchesResult.rows.map(row => row.match_id);

        // Aggregate batting stats for all players across all tournament matches
        const battingStatsQuery = `
            SELECT 
                player_id,
                player_name,
                COUNT(DISTINCT match_id) as batting_innings,
                SUM(runs) as total_runs,
                SUM(balls_faced) as total_balls,
                SUM(fours) as total_fours,
                SUM(sixes) as total_sixes,
                MAX(runs) as highest_score,
                CASE 
                    WHEN SUM(balls_faced) > 0 THEN (SUM(runs)::DECIMAL / SUM(balls_faced)::DECIMAL) * 100
                    ELSE 0 
                END as avg_strike_rate,
                SUM(CASE WHEN runs = 0 AND dismissal_info != 'not out' THEN 1 ELSE 0 END) as ducks
            FROM player_batting_stats
            WHERE match_id = ANY($1)
            GROUP BY player_id, player_name
        `;

        // Aggregate bowling stats for all players across all tournament matches
        const bowlingStatsQuery = `
            SELECT 
                player_id,
                player_name,
                COUNT(DISTINCT match_id) as bowling_innings,
                SUM(wickets) as total_wickets,
                SUM(overs::DECIMAL) as total_overs,
                SUM(runs_conceded) as total_runs_conceded,
                SUM(maidens) as total_maidens,
                SUM(dots) as total_dots,
                MAX(wickets) as max_wickets_in_innings,
                CASE 
                    WHEN SUM(overs::DECIMAL) > 0 THEN SUM(runs_conceded)::DECIMAL / SUM(overs::DECIMAL)
                    ELSE 0 
                END as avg_economy
            FROM player_bowling_stats
            WHERE match_id = ANY($1)
            GROUP BY player_id, player_name
        `;

        // Aggregate fielding stats
        const fieldingStatsQuery = `
            SELECT 
                player_id,
                player_name,
                SUM(catches) as total_catches,
                SUM(stumpings) as total_stumpings,
                SUM(runouts_direct) as total_runouts_direct,
                SUM(runouts_indirect) as total_runouts_indirect
            FROM player_fielding_stats
            WHERE match_id = ANY($1)
            GROUP BY player_id, player_name
        `;

        // Get dismissal details for LBW/Bowled bonus calculation
        const dismissalDetailsQuery = `
            SELECT 
                bowler_id,
                bowler_name,
                COUNT(*) FILTER (WHERE dismissal_type IN ('lbw', 'bowled')) as lbw_bowled_wickets
            FROM dismissal_details
            WHERE match_id = ANY($1) AND bowler_id IS NOT NULL
            GROUP BY bowler_id, bowler_name
        `;

        // Get Playing XI appearances
        const playingXIQuery = `
            SELECT 
                player_id,
                COUNT(DISTINCT match_id) as matches_in_xi
            FROM match_playing_xi
            WHERE match_id = ANY($1)
            GROUP BY player_id
        `;

        const [battingResult, bowlingResult, fieldingResult, dismissalResult, playingXIResult] = await Promise.all([
            client.query(battingStatsQuery, [matchIds]),
            client.query(bowlingStatsQuery, [matchIds]),
            client.query(fieldingStatsQuery, [matchIds]),
            client.query(dismissalDetailsQuery, [matchIds]),
            client.query(playingXIQuery, [matchIds])
        ]);

        // Merge batting and bowling stats
        const playerStatsMap = new Map();

        // Add batting stats
        battingResult.rows.forEach(batting => {
            playerStatsMap.set(batting.player_id, {
                player_id: batting.player_id,
                player_name: batting.player_name,
                batting_innings: parseInt(batting.batting_innings) || 0,
                total_runs: parseInt(batting.total_runs) || 0,
                total_balls: parseInt(batting.total_balls) || 0,
                total_fours: parseInt(batting.total_fours) || 0,
                total_sixes: parseInt(batting.total_sixes) || 0,
                highest_score: parseInt(batting.highest_score) || 0,
                avg_strike_rate: parseFloat(batting.avg_strike_rate) || 0,
                ducks: parseInt(batting.ducks) || 0,
                matches_in_xi: 0, // Will be populated from match_playing_xi table
                // Bowling stats (will be added if exist)
                bowling_innings: 0,
                total_wickets: 0,
                total_overs: 0,
                total_runs_conceded: 0,
                total_maidens: 0,
                total_dots: 0,
                max_wickets_in_innings: 0,
                avg_economy: 0,
                lbw_bowled_wickets: 0,
                // Fielding stats (will be added if exist)
                total_catches: 0,
                total_stumpings: 0,
                total_runouts_direct: 0,
                total_runouts_indirect: 0,
                matches_played: parseInt(batting.batting_innings) || 0
            });
        });

        // Add bowling stats
        bowlingResult.rows.forEach(bowling => {
            const playerId = bowling.player_id;
            
            if (playerStatsMap.has(playerId)) {
                // Player already exists with batting stats
                const player = playerStatsMap.get(playerId);
                player.bowling_innings = parseInt(bowling.bowling_innings) || 0;
                player.total_wickets = parseInt(bowling.total_wickets) || 0;
                player.total_overs = parseFloat(bowling.total_overs) || 0;
                player.total_runs_conceded = parseInt(bowling.total_runs_conceded) || 0;
                player.total_maidens = parseInt(bowling.total_maidens) || 0;
                player.total_dots = parseInt(bowling.total_dots) || 0;
                player.max_wickets_in_innings = parseInt(bowling.max_wickets_in_innings) || 0;
                player.avg_economy = parseFloat(bowling.avg_economy) || 0;
                player.matches_played = Math.max(player.batting_innings, player.bowling_innings);
            } else {
                // Player only has bowling stats
                playerStatsMap.set(playerId, {
                    player_id: bowling.player_id,
                    player_name: bowling.player_name,
                    batting_innings: 0,
                    total_runs: 0,
                    total_balls: 0,
                    total_fours: 0,
                    total_sixes: 0,
                    highest_score: 0,
                    avg_strike_rate: 0,
                    ducks: 0,
                    matches_in_xi: 0, // Will be populated from match_playing_xi table
                    bowling_innings: parseInt(bowling.bowling_innings) || 0,
                    total_wickets: parseInt(bowling.total_wickets) || 0,
                    total_overs: parseFloat(bowling.total_overs) || 0,
                    total_runs_conceded: parseInt(bowling.total_runs_conceded) || 0,
                    total_maidens: parseInt(bowling.total_maidens) || 0,
                    total_dots: parseInt(bowling.total_dots) || 0,
                    max_wickets_in_innings: parseInt(bowling.max_wickets_in_innings) || 0,
                    avg_economy: parseFloat(bowling.avg_economy) || 0,
                    lbw_bowled_wickets: 0,
                    total_catches: 0,
                    total_stumpings: 0,
                    total_runouts_direct: 0,
                    total_runouts_indirect: 0,
                    matches_played: parseInt(bowling.bowling_innings) || 0
                });
            }
        });

        // Add fielding stats
        fieldingResult.rows.forEach(fielding => {
            const playerId = fielding.player_id;
            
            if (playerStatsMap.has(playerId)) {
                const player = playerStatsMap.get(playerId);
                player.total_catches = parseInt(fielding.total_catches) || 0;
                player.total_stumpings = parseInt(fielding.total_stumpings) || 0;
                player.total_runouts_direct = parseInt(fielding.total_runouts_direct) || 0;
                player.total_runouts_indirect = parseInt(fielding.total_runouts_indirect) || 0;
            } else {
                // Player only has fielding stats (substitute fielder)
                playerStatsMap.set(playerId, {
                    player_id: fielding.player_id,
                    player_name: fielding.player_name,
                    batting_innings: 0,
                    total_runs: 0,
                    total_balls: 0,
                    total_fours: 0,
                    total_sixes: 0,
                    highest_score: 0,
                    avg_strike_rate: 0,
                    ducks: 0,
                    matches_in_xi: 0, // Will be populated from match_playing_xi table
                    bowling_innings: 0,
                    total_wickets: 0,
                    total_overs: 0,
                    total_runs_conceded: 0,
                    total_maidens: 0,
                    total_dots: 0,
                    max_wickets_in_innings: 0,
                    avg_economy: 0,
                    lbw_bowled_wickets: 0,
                    total_catches: parseInt(fielding.total_catches) || 0,
                    total_stumpings: parseInt(fielding.total_stumpings) || 0,
                    total_runouts_direct: parseInt(fielding.total_runouts_direct) || 0,
                    total_runouts_indirect: parseInt(fielding.total_runouts_indirect) || 0,
                    matches_played: 1
                });
            }
        });

        // Add LBW/Bowled wicket counts
        dismissalResult.rows.forEach(dismissal => {
            const playerId = dismissal.bowler_id;
            if (playerStatsMap.has(playerId)) {
                const player = playerStatsMap.get(playerId);
                player.lbw_bowled_wickets = parseInt(dismissal.lbw_bowled_wickets) || 0;
            }
        });

        // Add Playing XI counts
        playingXIResult.rows.forEach(xi => {
            const playerId = xi.player_id;
            if (playerStatsMap.has(playerId)) {
                const player = playerStatsMap.get(playerId);
                player.matches_in_xi = parseInt(xi.matches_in_xi) || 0;
            }
        });

        // Convert map to array
        const allPlayerStats = Array.from(playerStatsMap.values());

        res.json({
            success: true,
            data: allPlayerStats,
            message: `Stats loaded for ${allPlayerStats.length} players from ${matchIds.length} matches`
        });

    } catch (error) {
        console.error('Error fetching tournament stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tournament stats',
            error: error.message
        });
    }
};
