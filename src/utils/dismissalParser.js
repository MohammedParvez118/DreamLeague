/**
 * Parse dismissal information from the 'outdec' field
 * Examples:
 * - "c Fielder b Bowler" -> caught by Fielder, bowled by Bowler
 * - "lbw b Bowler" -> LBW, bowled by Bowler
 * - "b Bowler" -> bowled by Bowler
 * - "run out (Fielder)" -> run out by Fielder (direct hit)
 * - "st Keeper b Bowler" -> stumped by Keeper, bowled by Bowler
 * - "c and b Bowler" -> caught and bowled (bowler caught it)
 * - "not out" -> not dismissed
 */

export function parseDismissal(outdec) {
    if (!outdec || outdec.toLowerCase() === 'not out' || outdec.trim() === '') {
        return {
            type: 'not_out',
            bowler: null,
            fielder: null,
            isDirectHit: false,
            isLbwOrBowled: false
        };
    }

    const dismissal = outdec.trim();
    let type = 'other';
    let bowler = null;
    let fielder = null;
    let isDirectHit = false;
    let isLbwOrBowled = false;

    // Caught (various formats)
    if (dismissal.match(/^c\s+(.+?)\s+b\s+(.+)$/i)) {
        // "c Fielder b Bowler"
        const match = dismissal.match(/^c\s+(.+?)\s+b\s+(.+)$/i);
        type = 'caught';
        fielder = match[1].trim();
        bowler = match[2].trim();
    } else if (dismissal.match(/^c\s+and\s+b\s+(.+)$/i)) {
        // "c and b Bowler" - bowler caught it themselves
        const match = dismissal.match(/^c\s+and\s+b\s+(.+)$/i);
        type = 'caught_and_bowled';
        bowler = match[1].trim();
        fielder = match[1].trim(); // Bowler is also the fielder
    } else if (dismissal.match(/^c\s+(.+)$/i)) {
        // Just "c Fielder" (rare, no bowler info)
        const match = dismissal.match(/^c\s+(.+)$/i);
        type = 'caught';
        fielder = match[1].trim();
    }
    
    // Bowled
    else if (dismissal.match(/^b\s+(.+)$/i)) {
        // "b Bowler"
        const match = dismissal.match(/^b\s+(.+)$/i);
        type = 'bowled';
        bowler = match[1].trim();
        isLbwOrBowled = true;
    }
    
    // LBW
    else if (dismissal.match(/^lbw\s+b\s+(.+)$/i)) {
        // "lbw b Bowler"
        const match = dismissal.match(/^lbw\s+b\s+(.+)$/i);
        type = 'lbw';
        bowler = match[1].trim();
        isLbwOrBowled = true;
    } else if (dismissal.match(/^lbw\s+(.+)$/i)) {
        // Just "lbw Bowler"
        const match = dismissal.match(/^lbw\s+(.+)$/i);
        type = 'lbw';
        bowler = match[1].trim();
        isLbwOrBowled = true;
    }
    
    // Stumped
    else if (dismissal.match(/^st\s+(.+?)\s+b\s+(.+)$/i)) {
        // "st Keeper b Bowler"
        const match = dismissal.match(/^st\s+(.+?)\s+b\s+(.+)$/i);
        type = 'stumped';
        fielder = match[1].trim(); // Keeper who stumped
        bowler = match[2].trim();
    }
    
    // Run out
    else if (dismissal.match(/^run\s+out\s+\((.+?)\)$/i)) {
        // "run out (Fielder)" or "run out (Fielder1 / Fielder2)"
        const match = dismissal.match(/^run\s+out\s+\((.+?)\)$/i);
        type = 'run_out';
        const fielderText = match[1].trim();
        
        // Check if multiple fielders involved
        if (fielderText.includes('/') || fielderText.includes('&')) {
            // Multiple fielders - not a direct hit
            isDirectHit = false;
            // Take the last fielder (the one who hit the stumps)
            fielder = fielderText.split(/[\/&]/).pop().trim();
        } else {
            // Single fielder - direct hit
            isDirectHit = true;
            fielder = fielderText;
        }
    }
    
    // Hit wicket
    else if (dismissal.match(/^hit\s+wicket\s+b\s+(.+)$/i)) {
        const match = dismissal.match(/^hit\s+wicket\s+b\s+(.+)$/i);
        type = 'hit_wicket';
        bowler = match[1].trim();
    }

    return {
        type,
        bowler,
        fielder,
        isDirectHit,
        isLbwOrBowled,
        originalText: dismissal
    };
}

/**
 * Get player ID by name from the scorecard data
 * This helps match fielder/bowler names to their IDs
 */
export function findPlayerIdByName(name, scorecard) {
    if (!name || !scorecard) return null;

    // Search in both innings for all players
    for (const innings of scorecard.scorecard || []) {
        // Check batsmen
        for (const batsman of innings.batsman || []) {
            if (batsman.name?.toLowerCase() === name.toLowerCase() ||
                batsman.nickname?.toLowerCase() === name.toLowerCase()) {
                return batsman.id;
            }
        }
        // Check bowlers
        for (const bowler of innings.bowler || []) {
            if (bowler.name?.toLowerCase() === name.toLowerCase() ||
                bowler.nickname?.toLowerCase() === name.toLowerCase()) {
                return bowler.id;
            }
        }
    }

    return null;
}

/**
 * Extract all fielding contributions from an innings
 * Returns a map of player_id -> { catches, stumpings, runouts_direct, runouts_indirect }
 */
export function extractFieldingStats(innings, allScorecard) {
    const fieldingStats = new Map();

    for (const batsman of innings.batsman || []) {
        const dismissalInfo = parseDismissal(batsman.outdec);

        if (dismissalInfo.type === 'not_out') continue;

        // Handle catches
        if (dismissalInfo.type === 'caught' || dismissalInfo.type === 'caught_and_bowled') {
            const fielderId = findPlayerIdByName(dismissalInfo.fielder, allScorecard);
            if (fielderId) {
                if (!fieldingStats.has(fielderId)) {
                    fieldingStats.set(fielderId, {
                        player_id: fielderId,
                        player_name: dismissalInfo.fielder,
                        catches: 0,
                        stumpings: 0,
                        runouts_direct: 0,
                        runouts_indirect: 0
                    });
                }
                fieldingStats.get(fielderId).catches++;
            }
        }

        // Handle stumpings
        if (dismissalInfo.type === 'stumped') {
            const fielderId = findPlayerIdByName(dismissalInfo.fielder, allScorecard);
            if (fielderId) {
                if (!fieldingStats.has(fielderId)) {
                    fieldingStats.set(fielderId, {
                        player_id: fielderId,
                        player_name: dismissalInfo.fielder,
                        catches: 0,
                        stumpings: 0,
                        runouts_direct: 0,
                        runouts_indirect: 0
                    });
                }
                fieldingStats.get(fielderId).stumpings++;
            }
        }

        // Handle run-outs
        if (dismissalInfo.type === 'run_out') {
            const fielderId = findPlayerIdByName(dismissalInfo.fielder, allScorecard);
            if (fielderId) {
                if (!fieldingStats.has(fielderId)) {
                    fieldingStats.set(fielderId, {
                        player_id: fielderId,
                        player_name: dismissalInfo.fielder,
                        catches: 0,
                        stumpings: 0,
                        runouts_direct: 0,
                        runouts_indirect: 0
                    });
                }
                if (dismissalInfo.isDirectHit) {
                    fieldingStats.get(fielderId).runouts_direct++;
                } else {
                    fieldingStats.get(fielderId).runouts_indirect++;
                }
            }
        }
    }

    return fieldingStats;
}
