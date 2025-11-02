import pool from './src/config/database.js';

async function checkReplacementStatus() {
  try {
    console.log('=== Checking Replacement for Team 105 in League 84 ===\n');
    
    // Check replacement record
    const replacement = await pool.query(
      `SELECT * FROM squad_replacements 
       WHERE team_id = 105 AND league_id = 84
       ORDER BY requested_at DESC
       LIMIT 1`
    );
    
    if (replacement.rows.length > 0) {
      console.log('Latest Replacement:');
      console.table(replacement.rows.map(r => ({
        id: r.id,
        status: r.status,
        out_player: r.out_player_name,
        in_player: r.in_player_name,
        start_match: r.replacement_start_match_id,
        requested: r.requested_at,
        reviewed: r.reviewed_at
      })));
      
      const r = replacement.rows[0];
      
      // Check Playing XI updates
      console.log('\n=== Checking Playing XI Updates ===\n');
      
      // Check if OUT player is still in any Playing XI
      const outPlayerXI = await pool.query(
        `SELECT tpxi.match_id, lm.match_description, lm.match_start, lm.is_completed,
                tpxi.player_name, tpxi.is_captain, tpxi.is_vice_captain
         FROM team_playing_xi tpxi
         JOIN league_matches lm ON tpxi.match_id = lm.id
         WHERE tpxi.team_id = 105 
           AND tpxi.player_id = $1
         ORDER BY tpxi.match_id`,
        [r.out_player_id]
      );
      
      console.log(`OUT Player (${r.out_player_name}) in Playing XI:`);
      if (outPlayerXI.rows.length > 0) {
        console.table(outPlayerXI.rows);
      } else {
        console.log('✅ Not found in any Playing XI');
      }
      
      // Check if IN player is in Playing XI
      const inPlayerXI = await pool.query(
        `SELECT tpxi.match_id, lm.match_description, lm.match_start, lm.is_completed,
                tpxi.player_name, tpxi.is_captain, tpxi.is_vice_captain
         FROM team_playing_xi tpxi
         JOIN league_matches lm ON tpxi.match_id = lm.id
         WHERE tpxi.team_id = 105 
           AND tpxi.player_id = $1
         ORDER BY tpxi.match_id`,
        [r.in_player_id]
      );
      
      console.log(`\nIN Player (${r.in_player_name}) in Playing XI:`);
      if (inPlayerXI.rows.length > 0) {
        console.table(inPlayerXI.rows);
      } else {
        console.log('❌ Not found in any Playing XI');
      }
      
      // Check fantasy_squads
      console.log('\n=== Checking Fantasy Squad ===\n');
      
      const outSquad = await pool.query(
        `SELECT player_id, player_name, is_injured, injury_replacement_id
         FROM fantasy_squads
         WHERE team_id = 105 AND player_id = $1`,
        [r.out_player_id]
      );
      
      console.log('OUT Player in Squad:');
      console.table(outSquad.rows);
      
      const inSquad = await pool.query(
        `SELECT player_id, player_name, is_injured, injury_replacement_id
         FROM fantasy_squads
         WHERE team_id = 105 AND player_id = $1`,
        [r.in_player_id]
      );
      
      console.log('IN Player in Squad:');
      console.table(inSquad.rows);
      
    } else {
      console.log('No replacement found for Team 105');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkReplacementStatus();
