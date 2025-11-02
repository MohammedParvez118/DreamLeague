const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkTeamMatchCounts() {
  const client = await pool.connect();
  
  try {
    console.log('Investigating Team Match Count Discrepancy\n');
    console.log('='.repeat(80));
    
    // Check when teams joined
    const teamsQuery = await client.query(`
      SELECT id, team_name, created_at 
      FROM fantasy_squads 
      WHERE league_id = 84 
      ORDER BY id
    `);
    
    console.log('\n1. Teams in League 84:');
    teamsQuery.rows.forEach(team => {
      console.log(`   Team ${team.id}: ${team.team_name} - Joined: ${team.created_at}`);
    });
    
    // Check Playing XI counts
    console.log('\n' + '='.repeat(80));
    console.log('\n2. Playing XI Saved (team_playing_xi table):');
    const playingXIQuery = await client.query(`
      SELECT 
        team_id,
        fs.team_name,
        COUNT(DISTINCT match_id) as match_count,
        MIN(match_id) as first_match,
        MAX(match_id) as last_match,
        array_agg(DISTINCT match_id ORDER BY match_id) as match_ids
      FROM team_playing_xi tpx
      JOIN fantasy_squads fs ON tpx.team_id = fs.id
      WHERE fs.league_id = 84
      GROUP BY team_id, fs.team_name
      ORDER BY team_id
    `);
    
    playingXIQuery.rows.forEach(team => {
      console.log(`\n   Team ${team.team_id} (${team.team_name}):`);
      console.log(`   - Match count: ${team.match_count}`);
      console.log(`   - Range: ${team.first_match} to ${team.last_match}`);
      console.log(`   - Match IDs: ${team.match_ids.join(', ')}`);
    });
    
    // Check scores in team_match_scores
    console.log('\n' + '='.repeat(80));
    console.log('\n3. Calculated Scores (team_match_scores table):');
    const scoresQuery = await client.query(`
      SELECT 
        team_id,
        fs.team_name,
        COUNT(*) as score_records,
        SUM(total_points) as total_points,
        COUNT(CASE WHEN total_points > 0 THEN 1 END) as non_zero_scores,
        array_agg(match_id ORDER BY match_id) as scored_match_ids
      FROM team_match_scores tms
      JOIN fantasy_squads fs ON tms.team_id = fs.id
      WHERE fs.league_id = 84
      GROUP BY team_id, fs.team_name
      ORDER BY team_id
    `);
    
    scoresQuery.rows.forEach(team => {
      console.log(`\n   Team ${team.team_id} (${team.team_name}):`);
      console.log(`   - Score records: ${team.score_records}`);
      console.log(`   - Total points: ${team.total_points}`);
      console.log(`   - Non-zero scores: ${team.non_zero_scores}`);
      console.log(`   - Scored match IDs: ${team.scored_match_ids.slice(0, 15).join(', ')}${team.scored_match_ids.length > 15 ? '...' : ''}`);
    });
    
    // Check what the leaderboard query returns
    console.log('\n' + '='.repeat(80));
    console.log('\n4. Leaderboard Query Results (from league_leaderboard view):');
    const leaderboardQuery = await client.query(`
      SELECT 
        team_id,
        team_name,
        matches_played,
        total_points
      FROM league_leaderboard
      WHERE league_id = 84
      ORDER BY team_id
    `);
    
    leaderboardQuery.rows.forEach(team => {
      console.log(`   Team ${team.team_id} (${team.team_name}): ${team.matches_played} matches, ${team.total_points} points`);
    });
    
    // Check the leaderboard view definition
    console.log('\n' + '='.repeat(80));
    console.log('\n5. Analyzing Discrepancy:');
    
    for (const team of playingXIQuery.rows) {
      const scoreRecord = scoresQuery.rows.find(s => s.team_id === team.team_id);
      const leaderboardRecord = leaderboardQuery.rows.find(l => l.team_id === team.team_id);
      
      console.log(`\n   Team ${team.team_id} (${team.team_name}):`);
      console.log(`   - Playing XI saved: ${team.match_count} matches`);
      console.log(`   - Scores calculated: ${scoreRecord ? scoreRecord.score_records : 0} matches`);
      console.log(`   - Leaderboard shows: ${leaderboardRecord ? leaderboardRecord.matches_played : 0} matches`);
      
      if (scoreRecord && scoreRecord.score_records !== leaderboardRecord.matches_played) {
        console.log(`   ⚠️  MISMATCH: Score records (${scoreRecord.score_records}) != Leaderboard count (${leaderboardRecord.matches_played})`);
        
        // Find which matches are being counted/not counted
        const scoredMatchIds = scoreRecord.scored_match_ids;
        const countedQuery = await client.query(`
          SELECT match_id, total_points
          FROM team_match_scores
          WHERE team_id = $1
          ORDER BY match_id
        `, [team.team_id]);
        
        console.log(`   - Checking individual match scores:`);
        const nonZeroMatches = countedQuery.rows.filter(m => m.total_points > 0);
        const zeroMatches = countedQuery.rows.filter(m => m.total_points === 0);
        
        console.log(`   - Non-zero point matches: ${nonZeroMatches.length}`);
        console.log(`   - Zero point matches: ${zeroMatches.length}`);
      }
    }
    
    // Check the view definition
    console.log('\n' + '='.repeat(80));
    console.log('\n6. Checking league_leaderboard view definition:');
    const viewQuery = await client.query(`
      SELECT pg_get_viewdef('league_leaderboard', true) as view_definition
    `);
    
    console.log('\nView definition:');
    console.log(viewQuery.rows[0].view_definition);
    
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTeamMatchCounts();
