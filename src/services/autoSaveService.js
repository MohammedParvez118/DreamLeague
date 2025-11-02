/**
 * Automated Playing XI Auto-Save Service
 * Runs periodically to ensure all teams have Playing XI for locked matches
 */

import pool from '../config/database.js';

/**
 * Auto-save Playing XI for all teams in all leagues
 * Copies from previous match when:
 * 1. Match deadline has passed (locked)
 * 2. Team has no Playing XI saved for this match
 * 3. Team has Playing XI saved for a previous match
 */
export async function autoSavePlayingXIForAllLeagues() {
  const client = await pool.connect();
  
  try {
    console.log(`\n[${new Date().toISOString()}] Running Auto-Save Playing XI service...`);
    
    await client.query('BEGIN');
    
    // Get all active leagues
    const leaguesResult = await client.query(`
      SELECT DISTINCT league_id 
      FROM league_matches 
      WHERE match_start <= NOW()
      AND is_completed = FALSE
    `);
    
    let totalMatches = 0;
    let totalTeams = 0;
    let totalAutoSaved = 0;
    
    for (const { league_id } of leaguesResult.rows) {
      // Get all locked matches for this league
      const matchesResult = await client.query(`
        SELECT 
          lm.id as match_id,
          lm.league_id,
          lm.match_description,
          lm.match_start
        FROM league_matches lm
        WHERE lm.league_id = $1
          AND lm.match_start <= NOW()
          AND lm.is_completed = FALSE
        ORDER BY lm.id
      `, [league_id]);
      
      for (const match of matchesResult.rows) {
        totalMatches++;
        
        // Get previous match
        const previousMatchResult = await client.query(`
          SELECT id, match_description
          FROM league_matches
          WHERE league_id = $1
            AND id < $2
            AND match_start <= NOW()
          ORDER BY id DESC
          LIMIT 1
        `, [match.league_id, match.match_id]);
        
        if (previousMatchResult.rows.length === 0) {
          // First match - skip auto-save (users must manually set first lineup)
          continue;
        }
        
        const previousMatch = previousMatchResult.rows[0];
        
        // Get all teams in this league
        const teamsResult = await client.query(`
          SELECT id, team_name
          FROM fantasy_teams
          WHERE league_id = $1
        `, [match.league_id]);
        
        for (const team of teamsResult.rows) {
          totalTeams++;
          
          // Check if team has lineup for current match
          const currentXIResult = await client.query(`
            SELECT COUNT(*) as count
            FROM team_playing_xi
            WHERE team_id = $1 AND match_id = $2
          `, [team.id, match.match_id]);
          
          if (parseInt(currentXIResult.rows[0].count) > 0) {
            // Already has lineup
            continue;
          }
          
          // Get previous match lineup
          const previousXIResult = await client.query(`
            SELECT 
              player_id,
              player_name,
              player_role,
              squad_name,
              is_captain,
              is_vice_captain
            FROM team_playing_xi
            WHERE team_id = $1 AND match_id = $2
          `, [team.id, previousMatch.id]);
          
          if (previousXIResult.rows.length === 0) {
            // No previous lineup to copy from
            continue;
          }
          
          // Auto-save: Copy previous lineup to current match
          for (const player of previousXIResult.rows) {
            await client.query(`
              INSERT INTO team_playing_xi 
              (team_id, league_id, match_id, player_id, player_name, player_role, squad_name, is_captain, is_vice_captain)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (team_id, match_id, player_id) DO NOTHING
            `, [
              team.id,
              match.league_id,
              match.match_id,
              player.player_id,
              player.player_name,
              player.player_role,
              player.squad_name,
              player.is_captain,
              player.is_vice_captain
            ]);
          }
          
          totalAutoSaved++;
          console.log(`  ✓ Auto-saved: League ${match.league_id}, Match ${match.match_id}, Team ${team.id} (${team.team_name})`);
        }
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`✅ Auto-Save Complete:`);
    console.log(`   Leagues checked: ${leaguesResult.rows.length}`);
    console.log(`   Matches processed: ${totalMatches}`);
    console.log(`   Team checks: ${totalTeams}`);
    console.log(`   Auto-saved lineups: ${totalAutoSaved}`);
    console.log(`   Time: ${new Date().toISOString()}\n`);
    
    return {
      success: true,
      totalAutoSaved,
      totalMatches,
      totalTeams
    };
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Auto-Save Error:', err.message);
    return {
      success: false,
      error: err.message
    };
  } finally {
    client.release();
  }
}

/**
 * Start the auto-save service with periodic execution
 * Runs every 5 minutes by default
 */
export function startAutoSaveService(intervalMinutes = 5) {
  console.log(`🚀 Starting Auto-Save Playing XI Service (runs every ${intervalMinutes} minutes)`);
  
  // Run immediately on startup
  autoSavePlayingXIForAllLeagues();
  
  // Then run periodically
  const intervalMs = intervalMinutes * 60 * 1000;
  setInterval(autoSavePlayingXIForAllLeagues, intervalMs);
  
  console.log(`✓ Service started successfully\n`);
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  autoSavePlayingXIForAllLeagues()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}
