/**
 * Check which matches have player stats available
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

async function checkPlayerStats() {
  const client = await pool.connect();
  
  try {
    console.log('\n📊 Checking Player Stats Availability\n');
    console.log('='.repeat(80));
    
    // Check matches with Playing XI vs matches with player stats
    const matches = await client.query(`
      SELECT 
        lm.id,
        lm.match_id,
        lm.match_description,
        lm.match_start,
        COUNT(DISTINCT tpx.team_id) as teams_with_xi,
        EXISTS(SELECT 1 FROM player_batting_stats WHERE match_id = lm.match_id) as has_stats
      FROM league_matches lm
      LEFT JOIN team_playing_xi tpx ON lm.id = tpx.match_id
      WHERE lm.league_id = 84
        AND lm.match_start <= NOW()
      GROUP BY lm.id, lm.match_id, lm.match_description, lm.match_start
      ORDER BY lm.id
    `);
    
    console.log('\nMatch Status:');
    console.log('─'.repeat(80));
    console.log('ID   | Description     | Teams w/ XI | Has Stats | Score Records');
    console.log('─'.repeat(80));
    
    for (const match of matches.rows) {
      const scores = await client.query(`
        SELECT COUNT(DISTINCT team_id) as count
        FROM team_match_scores
        WHERE match_id = $1
      `, [match.id]);
      
      const scoreCount = scores.rows[0].count;
      const statsIcon = match.has_stats ? '✓' : '✗';
      const scoreIcon = scoreCount > 0 ? `${scoreCount}/3` : '0/3';
      
      console.log(
        `${match.id.toString().padStart(4)} | ` +
        `${match.match_description.padEnd(15)} | ` +
        `${match.teams_with_xi}/3         | ` +
        `${statsIcon.padEnd(9)} | ` +
        `${scoreIcon}`
      );
    }
    
    console.log('─'.repeat(80));
    
    // Summary
    const statsAvailable = matches.rows.filter(m => m.has_stats).length;
    const withXI = matches.rows.filter(m => m.teams_with_xi === 3).length;
    const withScores = await client.query(`
      SELECT COUNT(DISTINCT match_id) as count
      FROM team_match_scores
      WHERE match_id IN (
        SELECT id FROM league_matches 
        WHERE league_id = 84 AND match_start <= NOW()
      )
    `);
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total locked matches: ${matches.rows.length}`);
    console.log(`   Matches with all teams' XI: ${withXI}`);
    console.log(`   Matches with player stats: ${statsAvailable}`);
    console.log(`   Matches with score records: ${withScores.rows[0].count}`);
    
    console.log(`\n💡 Analysis:`);
    if (statsAvailable < matches.rows.length) {
      console.log(`   ⚠️  ${matches.rows.length - statsAvailable} matches are missing player stats`);
      console.log(`   These matches won't generate score records until stats are available`);
    }
    
    if (withXI === matches.rows.length) {
      console.log(`   ✅ All locked matches have Playing XI for all teams`);
    }
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkPlayerStats();
