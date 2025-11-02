import { db } from '../../config/database.js';
import axios from 'axios';
import { parseDismissal, findPlayerIdByName, extractFieldingStats } from '../../utils/dismissalParser.js';

const pool = db;

// Fetch and store match scorecard from RapidAPI
export const getMatchScorecard = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { matchId } = req.params;
        const { rapidApiMatchId } = req.query; // RapidAPI match ID (e.g., 40381)

        // Check if scorecard already exists in database
        const existingScorecard = await client.query(
            'SELECT ms.*, COUNT(pbs.id) as stats_count FROM match_summaries ms LEFT JOIN match_scorecards mc ON ms.match_id = mc.match_id LEFT JOIN player_batting_stats pbs ON mc.id = pbs.scorecard_id WHERE ms.match_id = $1 GROUP BY ms.id',
            [matchId]
        );

        // If scorecard exists and has stats, return from database
        if (existingScorecard.rows.length > 0 && existingScorecard.rows[0].stats_count > 0) {
            const scorecardData = await fetchScorecardFromDatabase(client, matchId);
            return res.json({
                success: true,
                data: scorecardData,
                source: 'database',
                message: 'Scorecard loaded from database'
            });
        }

        // If no rapidApiMatchId provided and not in database, return error with helpful message
        if (!rapidApiMatchId) {
            return res.status(400).json({
                success: false,
                message: 'No scorecard data available in database. Please provide rapidApiMatchId to fetch from API.',
                requiresApiCall: true
            });
        }

        // Fetch from RapidAPI (rate limited: 100/day, 6/minute)
        // Using /hscard endpoint (NOTE: dots and maidens data is not available/accurate in this API)
        console.log(`Fetching scorecard from RapidAPI for match ${matchId} (API ID: ${rapidApiMatchId})`);
        
        const options = {
            method: 'GET',
            url: `https://cricbuzz-cricket.p.rapidapi.com/mcenter/v1/${rapidApiMatchId}/hscard`,
            headers: {
                'x-rapidapi-key': process.env.RAPIDAPI_KEY,
                'x-rapidapi-host': process.env.RAPIDAPI_HOST || 'cricbuzz-cricket.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        const apiData = response.data;

        // Store in database
        await client.query('BEGIN');
        
        // Store match summary
        await client.query(
            `INSERT INTO match_summaries (match_id, match_status, is_match_complete, rapidapi_match_id, seo_title, web_url, response_last_updated)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (match_id) DO UPDATE SET
                match_status = EXCLUDED.match_status,
                is_match_complete = EXCLUDED.is_match_complete,
                web_url = EXCLUDED.web_url,
                response_last_updated = EXCLUDED.response_last_updated,
                updated_at = CURRENT_TIMESTAMP`,
            [
                matchId,
                apiData.status || 'In Progress',
                apiData.ismatchcomplete || false,
                rapidApiMatchId,
                apiData.appindex?.seotitle || null,
                apiData.appindex?.weburl || null,
                apiData.responselastupdated || null
            ]
        );

        // Process each innings from scorecard array (OLD API structure)
        for (const innings of apiData.scorecard || []) {
            
            // Insert innings scorecard
            const scorecardResult = await client.query(
                `INSERT INTO match_scorecards 
                (match_id, innings_id, innings_number, batting_team_name, batting_team_short_name, 
                 total_score, total_wickets, total_overs, run_rate, 
                 extras_total, extras_wides, extras_noballs, extras_byes, extras_legbyes, extras_penalty,
                 is_declared, is_followon)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                ON CONFLICT (match_id, innings_id) DO UPDATE SET
                    total_score = EXCLUDED.total_score,
                    total_wickets = EXCLUDED.total_wickets,
                    total_overs = EXCLUDED.total_overs,
                    run_rate = EXCLUDED.run_rate,
                    extras_total = EXCLUDED.extras_total
                RETURNING id`,
                [
                    matchId,
                    innings.inningsid,
                    innings.inningsid,
                    innings.batteamname,
                    innings.batteamsname,
                    innings.score,
                    innings.wickets,
                    innings.overs,
                    innings.runrate,
                    innings.extras?.total || 0,
                    innings.extras?.wides || 0,
                    innings.extras?.noballs || 0,
                    innings.extras?.byes || 0,
                    innings.extras?.legbyes || 0,
                    innings.extras?.penalty || 0,
                    innings.isdeclared || false,
                    innings.isfollowon || false
                ]
            );

            const scorecardId = scorecardResult.rows[0].id;

            // Insert batting stats - OLD API has batsman as array
            let battingPosition = 1;
            for (const batsman of innings.batsman || []) {
                
                await client.query(
                    `INSERT INTO player_batting_stats 
                    (scorecard_id, match_id, innings_id, player_id, player_name, player_nickname,
                     runs, balls_faced, fours, sixes, strike_rate, dismissal_info, dots,
                     is_captain, is_keeper, is_overseas, batting_position)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                    ON CONFLICT (match_id, innings_id, player_id) DO UPDATE SET
                        runs = EXCLUDED.runs,
                        balls_faced = EXCLUDED.balls_faced,
                        fours = EXCLUDED.fours,
                        sixes = EXCLUDED.sixes,
                        strike_rate = EXCLUDED.strike_rate,
                        dismissal_info = EXCLUDED.dismissal_info,
                        dots = EXCLUDED.dots`,
                    [
                        scorecardId,
                        matchId,
                        innings.inningsid,
                        batsman.id,
                        batsman.name,
                        batsman.nickname || null,
                        batsman.runs,
                        batsman.balls,
                        batsman.fours || 0,
                        batsman.sixes || 0,
                        parseFloat(batsman.strkrate) || 0,
                        batsman.outdec || null,
                        0,  // No dots available in API response
                        batsman.iscaptain || false,
                        batsman.iskeeper || false,
                        batsman.isoverseas || false,
                        battingPosition++
                    ]
                );
            }

            // Insert bowling stats - OLD API has bowler as array
            for (const bowler of innings.bowler || []) {
                
                await client.query(
                    `INSERT INTO player_bowling_stats 
                    (scorecard_id, match_id, innings_id, player_id, player_name, player_nickname,
                     overs, maidens, runs_conceded, wickets, economy, dots, balls_bowled,
                     is_captain, is_keeper, is_overseas)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                    ON CONFLICT (match_id, innings_id, player_id) DO UPDATE SET
                        overs = EXCLUDED.overs,
                        maidens = EXCLUDED.maidens,
                        runs_conceded = EXCLUDED.runs_conceded,
                        wickets = EXCLUDED.wickets,
                        economy = EXCLUDED.economy,
                        dots = EXCLUDED.dots,
                        balls_bowled = EXCLUDED.balls_bowled`,
                    [
                        scorecardId,
                        matchId,
                        innings.inningsid,
                        bowler.id,
                        bowler.name,
                        bowler.nickname || null,
                        parseFloat(bowler.overs) || 0,
                        bowler.maidens || 0,  // Available but always 0 in API
                        bowler.runs,
                        bowler.wickets,
                        parseFloat(bowler.economy) || 0,
                        bowler.dots || 0,  // Available but always 0 in API
                        bowler.balls || 0,
                        bowler.iscaptain || false,
                        bowler.iskeeper || false,
                        bowler.isoverseas || false
                    ]
                );
            }

            // Insert fall of wickets - OLD API structure
            if (innings.fow && innings.fow.fow) {
                for (const wkt of innings.fow.fow) {
                    
                    await client.query(
                        `INSERT INTO fall_of_wickets 
                        (scorecard_id, match_id, innings_id, batsman_id, batsman_name, 
                         wicket_number, runs_at_fall, over_number, ball_number)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                        [
                            scorecardId,
                            matchId,
                            innings.inningsid,
                            wkt.batsmanid,
                            wkt.batsmanname,
                            wkt.ballnbr ? Math.floor(wkt.ballnbr / 6) + 1 : 0, // Estimate wicket number from ball number
                            wkt.runs,
                            parseFloat(wkt.overnbr),
                            wkt.ballnbr
                        ]
                    );
                }
            }

            // Insert partnerships - OLD API structure
            if (innings.partnership && innings.partnership.partnership) {
                for (const partnership of innings.partnership.partnership) {
                    
                    await client.query(
                        `INSERT INTO partnerships 
                        (scorecard_id, match_id, innings_id, partnership_number,
                         batsman1_id, batsman1_name, batsman1_runs, batsman1_balls, batsman1_fours, batsman1_sixes,
                         batsman2_id, batsman2_name, batsman2_runs, batsman2_balls, batsman2_fours, batsman2_sixes,
                         total_runs, total_balls)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
                        [
                            scorecardId,
                            matchId,
                            innings.inningsid,
                            partnership.id || 0,
                            partnership.bat1id,
                            partnership.bat1name,
                            partnership.bat1runs || 0,
                            partnership.bat1balls || 0,
                            partnership.bat1fours || 0,
                            partnership.bat1sixes || 0,
                            partnership.bat2id,
                            partnership.bat2name,
                            partnership.bat2runs || 0,
                            partnership.bat2balls || 0,
                            partnership.bat2fours || 0,
                            partnership.bat2sixes || 0,
                            partnership.totalruns || 0,
                            partnership.totalballs || 0
                        ]
                    );
                }
            }

            // Extract and store fielding stats and dismissals from batsmen (OLD API)
            // Parse dismissal text to extract fielding stats
            for (const batsman of innings.batsman || []) {
                
                if (!batsman.outdec || batsman.outdec === 'not out') continue;
                
                // Parse dismissal using helper function
                const dismissalInfo = parseDismissal(batsman.outdec, innings.bowler || []);
                
                // Store dismissal details
                await client.query(
                    `INSERT INTO dismissal_details 
                    (match_id, innings_id, batsman_id, batsman_name, dismissal_type, 
                     bowler_id, bowler_name, fielder_id, fielder_name, is_direct_hit, dismissal_text)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (match_id, innings_id, batsman_id) DO UPDATE SET
                        dismissal_type = EXCLUDED.dismissal_type,
                        bowler_id = EXCLUDED.bowler_id,
                        fielder_id = EXCLUDED.fielder_id,
                        is_direct_hit = EXCLUDED.is_direct_hit,
                        dismissal_text = EXCLUDED.dismissal_text`,
                    [
                        matchId,
                        innings.inningsid,
                        batsman.id,
                        batsman.name,
                        dismissalInfo.type,
                        dismissalInfo.bowlerId || null,
                        dismissalInfo.bowlerName || null,
                        dismissalInfo.fielderId || null,
                        dismissalInfo.fielderName || null,
                        dismissalInfo.isDirectHit || false,
                        batsman.outdec || ''
                    ]
                );
            }

            // Extract fielding stats separately
            const fieldingStats = extractFieldingStats(innings.batsman || [], innings.bowler || []);
            
            // Store fielding stats
            for (const [playerId, stats] of Object.entries(fieldingStats)) {
                await client.query(
                    `INSERT INTO player_fielding_stats 
                    (match_id, innings_id, player_id, player_name, catches, stumpings, runouts_direct, runouts_indirect)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (match_id, innings_id, player_id) DO UPDATE SET
                        catches = player_fielding_stats.catches + EXCLUDED.catches,
                        stumpings = player_fielding_stats.stumpings + EXCLUDED.stumpings,
                        runouts_direct = player_fielding_stats.runouts_direct + EXCLUDED.runouts_direct,
                        runouts_indirect = player_fielding_stats.runouts_indirect + EXCLUDED.runouts_indirect,
                        updated_at = CURRENT_TIMESTAMP`,
                    [
                        matchId,
                        innings.inningsid,
                        playerId,
                        stats.name || `Player ${playerId}`,
                        stats.catches || 0,
                        stats.stumpings || 0,
                        stats.runouts_direct || 0,
                        stats.runouts_indirect || 0
                    ]
                );
            }
        }

        // Populate Playing XI table - get all unique players who batted or bowled (OLD API structure)
        const playingXIPlayers = new Map();
        
        for (const innings of apiData.scorecard || []) {
            // Add batsmen to Playing XI
            for (const batsman of innings.batsman || []) {
                if (!playingXIPlayers.has(batsman.id)) {
                    playingXIPlayers.set(batsman.id, batsman.name);
                }
            }
            
            // Add bowlers to Playing XI
            for (const bowler of innings.bowler || []) {
                if (!playingXIPlayers.has(bowler.id)) {
                    playingXIPlayers.set(bowler.id, bowler.name);
                }
            }
        }
        
        // Insert all Playing XI players
        for (const [playerId, playerName] of playingXIPlayers.entries()) {
            await client.query(
                `INSERT INTO match_playing_xi (match_id, player_id, player_name)
                VALUES ($1, $2, $3)
                ON CONFLICT (match_id, player_id) DO NOTHING`,
                [matchId, playerId, playerName]
            );
        }

        await client.query('COMMIT');

        // Fetch and return the stored data
        const scorecardData = await fetchScorecardFromDatabase(client, matchId);

        res.json({
            success: true,
            data: scorecardData,
            source: 'rapidapi',
            message: 'Scorecard fetched and stored successfully'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error fetching match scorecard:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching match scorecard',
            error: error.message
        });
    } finally {
        client.release();
    }
};

// Helper function to fetch scorecard from database
async function fetchScorecardFromDatabase(client, matchId) {
    // Get match summary
    const summaryResult = await client.query(
        'SELECT * FROM match_summaries WHERE match_id = $1',
        [matchId]
    );

    // Get innings scorecards
    const inningsResult = await client.query(
        'SELECT * FROM match_scorecards WHERE match_id = $1 ORDER BY innings_number',
        [matchId]
    );

    const scorecards = [];

    for (const innings of inningsResult.rows) {
        // Get batting stats
        const battingStats = await client.query(
            'SELECT * FROM player_batting_stats WHERE scorecard_id = $1 ORDER BY batting_position',
            [innings.id]
        );

        // Get bowling stats
        const bowlingStats = await client.query(
            'SELECT * FROM player_bowling_stats WHERE scorecard_id = $1 ORDER BY wickets DESC, runs_conceded ASC',
            [innings.id]
        );

        // Get fall of wickets
        const fowStats = await client.query(
            'SELECT * FROM fall_of_wickets WHERE scorecard_id = $1 ORDER BY wicket_number',
            [innings.id]
        );

        // Get partnerships
        const partnerships = await client.query(
            'SELECT * FROM partnerships WHERE scorecard_id = $1 ORDER BY partnership_number',
            [innings.id]
        );

        scorecards.push({
            innings: innings,
            batting: battingStats.rows,
            bowling: bowlingStats.rows,
            fallOfWickets: fowStats.rows,
            partnerships: partnerships.rows
        });
    }

    return {
        summary: summaryResult.rows[0],
        scorecards: scorecards
    };
}

// Get combined player stats (batting + bowling) for a match
export const getPlayerCombinedStats = async (req, res) => {
    try {
        const { matchId } = req.params;

        const query = `
            SELECT 
                COALESCE(b.player_id, bw.player_id) as player_id,
                COALESCE(b.player_name, bw.player_name) as player_name,
                COALESCE(b.innings_id, bw.innings_id) as innings_id,
                b.runs, b.balls_faced, b.fours, b.sixes, b.strike_rate, b.dismissal_info,
                bw.overs, bw.maidens, bw.runs_conceded, bw.wickets, bw.economy, bw.dots,
                COALESCE(b.is_captain, bw.is_captain, false) as is_captain,
                COALESCE(b.is_keeper, bw.is_keeper, false) as is_keeper,
                COALESCE(b.is_overseas, bw.is_overseas, false) as is_overseas
            FROM player_batting_stats b
            FULL OUTER JOIN player_bowling_stats bw 
                ON b.match_id = bw.match_id 
                AND b.innings_id = bw.innings_id 
                AND b.player_id = bw.player_id
            WHERE COALESCE(b.match_id, bw.match_id) = $1
            ORDER BY innings_id, COALESCE(b.batting_position, 999), bw.wickets DESC
        `;

        const result = await pool.query(query, [matchId]);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Error fetching combined player stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching player statistics',
            error: error.message
        });
    }
};
