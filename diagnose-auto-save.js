/**
 * Diagnose why auto-save Playing XI isn't working for all completed matches
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

async function diagnoseAutoSave() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Diagnosing Auto-Save Playing XI Issue\n');
    console.log('='.repeat(80));
    
    // Check total matches
    const totalMatches = await client.query(`
      SELECT COUNT(*) as count
      FROM league_matches
      WHERE league_id = 84
    `);
    console.log(`\n📊 Total matches in league: ${totalMatches.rows[0].count}`);
    
    // Check completed matches
    const completedMatches = await client.query(`
      SELECT 
        id,
        match_description,
        match_start,
        is_completed,
        CASE 
          WHEN match_start <= NOW() THEN 'Locked'
          ELSE 'Open'
        END as status
      FROM league_matches
      WHERE league_id = 84
      ORDER BY id
    `);
    
    console.log(`\n📅 Match Status Breakdown:`);
    console.log('─'.repeat(80));
    
    let lockedCount = 0;
    let openCount = 0;
    let completedCount = 0;
    
    completedMatches.rows.forEach(match => {
      if (match.status === 'Locked') lockedCount++;
      if (match.status === 'Open') openCount++;
      if (match.is_completed) completedCount++;
    });
    
    console.log(`Total matches: ${completedMatches.rows.length}`);
    console.log(`Locked (deadline passed): ${lockedCount}`);
    console.log(`Open (deadline not passed): ${openCount}`);
    console.log(`Marked as completed (is_completed=true): ${completedCount}`);
    
    // Check Playing XI coverage for each team
    console.log('\n' + '='.repeat(80));
    console.log('\n📋 Playing XI Coverage by Team:\n');
    
    const teams = await client.query(`
      SELECT id, team_name
      FROM fantasy_teams
      WHERE league_id = 84
      ORDER BY id
    `);
    
    for (const team of teams.rows) {
      const xiCount = await client.query(`
        SELECT COUNT(DISTINCT match_id) as count
        FROM team_playing_xi
        WHERE team_id = $1
      `, [team.id]);
      
      console.log(`Team ${team.id} (${team.team_name}): ${xiCount.rows[0].count} matches with Playing XI saved`);
      
      // Find which matches are missing
      const missingMatches = await client.query(`
        SELECT lm.id, lm.match_description, lm.match_start
        FROM league_matches lm
        WHERE lm.league_id = 84
          AND lm.match_start <= NOW()  -- Locked matches only
          AND NOT EXISTS (
            SELECT 1 FROM team_playing_xi tpx
            WHERE tpx.team_id = $1 AND tpx.match_id = lm.id
          )
        ORDER BY lm.id
        LIMIT 10
      `, [team.id]);
      
      if (missingMatches.rows.length > 0) {
        console.log(`  ⚠️  Missing Playing XI for ${missingMatches.rows.length} locked matches:`);
        missingMatches.rows.forEach(match => {
          console.log(`     - Match ${match.id}: ${match.match_description} (deadline: ${match.match_start.toISOString().split('T')[0]})`);
        });
      }
      console.log('');
    }
    
    // Check if first match has XI (needed for auto-save to work)
    console.log('='.repeat(80));
    console.log('\n🔧 Auto-Save Prerequisites:\n');
    
    const firstMatch = await client.query(`
      SELECT id, match_description
      FROM league_matches
      WHERE league_id = 84
      ORDER BY id
      LIMIT 1
    `);
    
    if (firstMatch.rows.length > 0) {
      const firstMatchId = firstMatch.rows[0].id;
      console.log(`First match: ${firstMatch.rows[0].match_description} (ID: ${firstMatchId})`);
      
      for (const team of teams.rows) {
        const hasFirstXI = await client.query(`
          SELECT COUNT(*) as count
          FROM team_playing_xi
          WHERE team_id = $1 AND match_id = $2
        `, [team.id, firstMatchId]);
        
        const count = parseInt(hasFirstXI.rows[0].count);
        if (count > 0) {
          console.log(`  ✅ Team ${team.id} (${team.team_name}): Has XI for first match (${count} players)`);
        } else {
          console.log(`  ❌ Team ${team.id} (${team.team_name}): NO XI for first match - auto-save won't work!`);
        }
      }
    }
    
    // Check the auto-save logic criteria
    console.log('\n' + '='.repeat(80));
    console.log('\n🤔 Why Auto-Save Might Not Be Working:\n');
    
    console.log('Auto-save requires:');
    console.log('  1. Match deadline has passed (match_start <= NOW())');
    console.log('  2. Team has NO Playing XI saved for current match');
    console.log('  3. Team HAS Playing XI saved for a previous match');
    console.log('  4. Script must be run manually or scheduled\n');
    
    console.log('Possible issues:');
    console.log('  ❌ Auto-save script is not scheduled/running automatically');
    console.log('  ❌ Match deadlines may be in the future (not locked yet)');
    console.log('  ❌ First match may not have XI saved for some teams');
    console.log('  ❌ Script may have encountered errors silently\n');
    
    // Show sample of locked matches without XI
    console.log('='.repeat(80));
    console.log('\n📋 Sample: Locked Matches Missing Playing XI:\n');
    
    const sampleMissing = await client.query(`
      SELECT 
        lm.id,
        lm.match_description,
        lm.match_start,
        COUNT(DISTINCT tpx.team_id) as teams_with_xi
      FROM league_matches lm
      LEFT JOIN team_playing_xi tpx ON lm.id = tpx.match_id
      WHERE lm.league_id = 84
        AND lm.match_start <= NOW()
      GROUP BY lm.id, lm.match_description, lm.match_start
      HAVING COUNT(DISTINCT tpx.team_id) < 3  -- Less than all teams
      ORDER BY lm.id
      LIMIT 10
    `);
    
    if (sampleMissing.rows.length > 0) {
      console.log('Match ID | Description     | Deadline   | Teams with XI');
      console.log('---------|-----------------|------------|---------------');
      sampleMissing.rows.forEach(match => {
        const date = match.match_start.toISOString().split('T')[0];
        console.log(`${match.id.toString().padStart(8)} | ${match.match_description.padEnd(15)} | ${date} | ${match.teams_with_xi}/3`);
      });
    } else {
      console.log('✅ All locked matches have Playing XI for all teams!');
    }
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

diagnoseAutoSave();
