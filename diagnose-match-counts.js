/**
 * Quick diagnostic: Check which teams have Playing XI saved for which matches
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Fantasy',
  password: 'P@rvezn00r',
  port: 5432,
});

async function diagnoseMatchCounts() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Diagnosing Match Count Discrepancy\n');
    console.log('='.repeat(80));
    
    // Get all teams
    const teams = await client.query(`
      SELECT id, team_name, created_at
      FROM fantasy_teams
      WHERE league_id = 84
      ORDER BY id
    `);
    
    console.log('\n📋 Teams in League 84:');
    teams.rows.forEach(t => {
      console.log(`   Team ${t.id}: ${t.team_name} (joined: ${t.created_at.toISOString().split('T')[0]})`);
    });
    
    // Get all matches
    const matches = await client.query(`
      SELECT id, match_description, match_start
      FROM league_matches
      WHERE league_id = 84
      ORDER BY id
      LIMIT 15
    `);
    
    console.log(`\n📅 First 15 Matches in League 84:\n`);
    
    // Create a matrix showing which teams have Playing XI for which matches
    console.log('Match | Description    | Team 105 | Team 106 | Team 107');
    console.log('------|----------------|----------|----------|----------');
    
    for (const match of matches.rows) {
      const playingXI = await client.query(`
        SELECT team_id, COUNT(*) as player_count
        FROM team_playing_xi
        WHERE match_id = $1 AND team_id IN (105, 106, 107)
        GROUP BY team_id
      `, [match.id]);
      
      const team105 = playingXI.rows.find(t => t.team_id === 105)?.player_count || 0;
      const team106 = playingXI.rows.find(t => t.team_id === 106)?.player_count || 0;
      const team107 = playingXI.rows.find(t => t.team_id === 107)?.player_count || 0;
      
      const mark105 = team105 >= 11 ? '   ✓    ' : '   ✗    ';
      const mark106 = team106 >= 11 ? '   ✓    ' : '   ✗    ';
      const mark107 = team107 >= 11 ? '   ✓    ' : '   ✗    ';
      
      console.log(`${match.id.toString().padStart(5)} | ${match.match_description.padEnd(14)} | ${mark105} | ${mark106} | ${mark107}`);
    }
    
    // Get score records
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Score Records in team_match_scores:\n');
    
    for (const team of teams.rows) {
      const scores = await client.query(`
        SELECT COUNT(*) as count, 
               COUNT(CASE WHEN total_points > 0 THEN 1 END) as non_zero,
               array_agg(match_id ORDER BY match_id) as match_ids
        FROM team_match_scores
        WHERE team_id = $1
      `, [team.id]);
      
      console.log(`Team ${team.id} (${team.team_name}):`);
      console.log(`  Total score records: ${scores.rows[0].count}`);
      console.log(`  Non-zero scores: ${scores.rows[0].non_zero}`);
      const matchIds = scores.rows[0].match_ids || [];
      if (matchIds.length > 0) {
        console.log(`  Match IDs: ${matchIds.slice(0, 15).join(', ')}${matchIds.length > 15 ? '...' : ''}`);
      }
      console.log('');
    }
    
    // Summary
    console.log('='.repeat(80));
    console.log('\n💡 Analysis:\n');
    
    const playingXICounts = await client.query(`
      SELECT team_id, COUNT(DISTINCT match_id) as match_count
      FROM team_playing_xi
      WHERE team_id IN (105, 106, 107)
      GROUP BY team_id
      ORDER BY team_id
    `);
    
    console.log('Playing XI saved for:');
    playingXICounts.rows.forEach(t => {
      const teamName = teams.rows.find(team => team.id === t.team_id)?.team_name;
      console.log(`  Team ${t.team_id} (${teamName}): ${t.match_count} matches`);
    });
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

diagnoseMatchCounts();
