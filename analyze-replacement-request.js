import pool from './src/config/database.js';

async function analyzeReplacementRequest() {
  try {
    console.log('=== Analyzing Replacement Request ===\n');
    
    const replacement = await pool.query(`
      SELECT 
        sr.*,
        lm.match_description as start_match_name,
        lm.match_start as start_match_time,
        lm.match_start > NOW() as start_match_is_future,
        lm.is_completed as start_match_is_completed
      FROM squad_replacements sr
      JOIN league_matches lm ON sr.replacement_start_match_id = lm.id
      WHERE sr.id = 7
    `);
    
    console.log('Replacement Request Details:');
    const r = replacement.rows[0];
    console.table([{
      id: r.id,
      team_id: r.team_id,
      out_player: r.out_player_name,
      in_player: r.in_player_name,
      start_match: r.replacement_start_match_id,
      start_match_name: r.start_match_name,
      start_match_time: r.start_match_time,
      is_future: r.start_match_is_future,
      is_completed: r.start_match_is_completed,
      status: r.status,
      requested_at: r.requested_at,
      reviewed_at: r.reviewed_at
    }]);
    
    console.log('\n=== Analysis ===');
    console.log(`The replacement was requested to start from match ${r.replacement_start_match_id} (${r.start_match_name})`);
    console.log(`Match ${r.replacement_start_match_id} time: ${r.start_match_time}`);
    console.log(`Is this match in the future? ${r.start_match_is_future ? '✅ Yes' : '❌ No (already locked/started)'}`);
    console.log(`\n🔍 CONCLUSION:`);
    
    if (!r.start_match_is_future) {
      console.log(`❌ The replacement start match has already passed!`);
      console.log(`   The function correctly skips it because match_start > NOW() = false`);
      console.log(`\n💡 SOLUTIONS:`);
      console.log(`   1. Apply replacement from next available future match`);
      console.log(`   2. OR allow retroactive replacement for locked-but-not-completed matches`);
    } else {
      console.log(`✅ The replacement start match is in the future`);
      console.log(`   The function should work correctly`);
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

analyzeReplacementRequest();
