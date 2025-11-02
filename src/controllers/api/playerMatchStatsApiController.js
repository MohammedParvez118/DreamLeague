import { db } from '../../config/database.js';

const client = db;

/**
 * Get match-by-match statistics for a specific player in a tournament
 */
export const getPlayerMatchStats = async (req, res) => {
    try {
        const { tournamentId, playerId } = req.params;

        // Get all matches for this tournament (excluding abandoned/no result)
        const matchesQuery = `
            SELECT 
                m.match_id,
                m.match_description,
                m.start_time,
                m.result,
                m.team1,
                m.team2
            FROM matches m
            WHERE m.series_id = $1
            AND m.result NOT ILIKE '%no result%'
            AND m.result NOT ILIKE '%abandon%'
            AND m.result NOT ILIKE '%match cancelled%'
            ORDER BY 
                CASE 
                    WHEN m.match_description ~ '(\d+)(st|nd|rd|th)\s+Match'
                    THEN CAST(substring(m.match_description from '(\d+)') AS INTEGER)
                    ELSE 9999 
                END,
                m.match_id
        `;
        const matchesResult = await client.query(matchesQuery, [tournamentId]);

        if (matchesResult.rows.length === 0) {
            return res.json({
                success: true,
                data: {
                    player_name: null,
                    matches: []
                },
                message: 'No matches found for this tournament'
            });
        }

        const matches = matchesResult.rows;
        const matchIds = matches.map(m => m.match_id);

        // Get player info
        const playerInfoQuery = `
            SELECT DISTINCT player_name
            FROM player_batting_stats
            WHERE player_id = $1
            LIMIT 1
        `;
        const playerInfoResult = await client.query(playerInfoQuery, [playerId]);
        
        let playerName = null;
        if (playerInfoResult.rows.length > 0) {
            playerName = playerInfoResult.rows[0].player_name;
        } else {
            // Try bowling stats
            const bowlerInfoQuery = `
                SELECT DISTINCT player_name
                FROM player_bowling_stats
                WHERE player_id = $1
                LIMIT 1
            `;
            const bowlerInfoResult = await client.query(bowlerInfoQuery, [playerId]);
            if (bowlerInfoResult.rows.length > 0) {
                playerName = bowlerInfoResult.rows[0].player_name;
            }
        }

        // Get batting stats for all matches
        const battingStatsQuery = `
            SELECT 
                match_id,
                runs,
                balls_faced,
                fours,
                sixes,
                strike_rate,
                dismissal_info
            FROM player_batting_stats
            WHERE player_id = $1 AND match_id = ANY($2)
        `;

        // Get bowling stats for all matches
        const bowlingStatsQuery = `
            SELECT 
                match_id,
                wickets,
                overs,
                runs_conceded,
                maidens,
                dots,
                economy
            FROM player_bowling_stats
            WHERE player_id = $1 AND match_id = ANY($2)
        `;

        // Get fielding stats for all matches
        const fieldingStatsQuery = `
            SELECT 
                match_id,
                catches,
                stumpings,
                runouts_direct,
                runouts_indirect
            FROM player_fielding_stats
            WHERE player_id = $1 AND match_id = ANY($2)
        `;

        // Get dismissal details for LBW/Bowled bonus calculation
        const dismissalDetailsQuery = `
            SELECT 
                match_id,
                COUNT(*) FILTER (WHERE dismissal_type IN ('lbw', 'bowled')) as lbw_bowled_wickets
            FROM dismissal_details
            WHERE bowler_id = $1 AND match_id = ANY($2)
            GROUP BY match_id
        `;

        // Check if player was in Playing XI
        const playingXIQuery = `
            SELECT match_id
            FROM match_playing_xi
            WHERE player_id = $1 AND match_id = ANY($2)
        `;

        const [battingResult, bowlingResult, fieldingResult, dismissalResult, playingXIResult] = await Promise.all([
            client.query(battingStatsQuery, [playerId, matchIds]),
            client.query(bowlingStatsQuery, [playerId, matchIds]),
            client.query(fieldingStatsQuery, [playerId, matchIds]),
            client.query(dismissalDetailsQuery, [playerId, matchIds]),
            client.query(playingXIQuery, [playerId, matchIds])
        ]);

        // Create maps for quick lookup
        const battingMap = new Map(battingResult.rows.map(r => [r.match_id, r]));
        const bowlingMap = new Map(bowlingResult.rows.map(r => [r.match_id, r]));
        const fieldingMap = new Map(fieldingResult.rows.map(r => [r.match_id, r]));
        const dismissalMap = new Map(dismissalResult.rows.map(r => [r.match_id, r]));
        const playingXISet = new Set(playingXIResult.rows.map(r => r.match_id));

        // Build match-by-match stats
        const matchStats = matches.map(match => {
            const played = playingXISet.has(match.match_id) || 
                           battingMap.has(match.match_id) || 
                           bowlingMap.has(match.match_id);

            // Skip this match if player has no association with it at all
            // (not in playing XI, no batting, no bowling, no fielding stats)
            if (!played && !fieldingMap.has(match.match_id)) {
                return null; // Will be filtered out
            }

            const batting = battingMap.get(match.match_id);
            const bowling = bowlingMap.get(match.match_id);
            const fielding = fieldingMap.get(match.match_id) || {};
            const dismissal = dismissalMap.get(match.match_id) || {};

            return {
                match_id: match.match_id,
                match_description: match.match_description,
                start_time: match.start_time,
                result: match.result,
                team1: match.team1,
                team2: match.team2,
                played: played,
                batting: batting ? {
                    runs: parseInt(batting.runs) || 0,
                    balls_faced: parseInt(batting.balls_faced) || 0,
                    fours: parseInt(batting.fours) || 0,
                    sixes: parseInt(batting.sixes) || 0,
                    strike_rate: parseFloat(batting.strike_rate) || 0,
                    dismissal_info: batting.dismissal_info,
                    is_duck: parseInt(batting.runs) === 0 && batting.dismissal_info && batting.dismissal_info !== 'not out'
                } : null,
                bowling: bowling ? {
                    wickets: parseInt(bowling.wickets) || 0,
                    overs: parseFloat(bowling.overs) || 0,
                    runs_conceded: parseInt(bowling.runs_conceded) || 0,
                    maidens: parseInt(bowling.maidens) || 0,
                    dots: parseInt(bowling.dots) || 0,
                    economy_rate: parseFloat(bowling.economy) || 0,
                    lbw_bowled_wickets: parseInt(dismissal.lbw_bowled_wickets) || 0
                } : null,
                fielding: {
                    catches: parseInt(fielding.catches) || 0,
                    stumpings: parseInt(fielding.stumpings) || 0,
                    runouts_direct: parseInt(fielding.runouts_direct) || 0,
                    runouts_indirect: parseInt(fielding.runouts_indirect) || 0
                }
            };
        }).filter(match => match !== null); // Remove null entries (matches where player wasn't involved)

        res.json({
            success: true,
            data: {
                player_id: playerId,
                player_name: playerName,
                tournament_id: tournamentId,
                matches: matchStats
            }
        });

    } catch (error) {
        console.error('Error fetching player match stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch player match stats',
            error: error.message
        });
    }
};
