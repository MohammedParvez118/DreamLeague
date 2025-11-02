import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Fantasy',
  password: 'P@rvezn00r',
  port: 5432,
});

/**
 * Auto-save Playing XI from previous match for teams that haven't saved yet
 * This should run after a match deadline passes
 */
async function autoSavePlayingXIForLockedMatches() {
  const client = await pool.connect();
  
  try {
    console.log('\n=== Auto-Saving Playing XI for Locked Matches ===\n');

    await client.query('BEGIN');

    // Find all locked matches (deadline passed) in league 84
    const lockedMatchesResult = await client.query(`
      SELECT 
        id as match_id,
        league_id,
        match_description,
        match_start
      FROM league_matches
      WHERE league_id = 84
      AND match_start <= NOW()
      AND is_completed = FALSE
      ORDER BY id
    `);

    console.log(`Found ${lockedMatchesResult.rows.length} locked matches\n`);

    for (const match of lockedMatchesResult.rows) {
      console.log(`Processing: ${match.match_description} (Match ID: ${match.match_id})`);

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
        console.log(`  ⚠️  No previous match found (this is the first match)\n`);
        continue;
      }

      const previousMatch = previousMatchResult.rows[0];
      console.log(`  Previous match: ${previousMatch.match_description} (ID: ${previousMatch.id})`);

      // Get all teams in this league
      const teamsResult = await client.query(`
        SELECT id, team_name
        FROM fantasy_teams
        WHERE league_id = $1
      `, [match.league_id]);

      for (const team of teamsResult.rows) {
        // Check if this team has saved Playing XI for current match
        const currentLineupResult = await client.query(`
          SELECT COUNT(*) as count
          FROM team_playing_xi
          WHERE team_id = $1 AND match_id = $2
        `, [team.id, match.match_id]);

        const hasCurrentLineup = parseInt(currentLineupResult.rows[0].count) > 0;

        if (hasCurrentLineup) {
          console.log(`    ✓ ${team.team_name}: Already has lineup saved`);
          continue;
        }

        // Get previous match lineup
        const previousLineupResult = await client.query(`
          SELECT 
            player_id,
            player_name,
            player_role,
            squad_name,
            is_captain,
            is_vice_captain
          FROM team_playing_xi
          WHERE team_id = $1 AND match_id = $2
          ORDER BY id
        `, [team.id, previousMatch.id]);

        if (previousLineupResult.rows.length === 0) {
          console.log(`    ⚠️  ${team.team_name}: No previous lineup found`);
          continue;
        }

        // Auto-save previous lineup to current match
        for (const player of previousLineupResult.rows) {
          await client.query(`
            INSERT INTO team_playing_xi 
            (team_id, league_id, match_id, player_id, player_name, player_role, squad_name, is_captain, is_vice_captain, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
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

        console.log(`    ✅ ${team.team_name}: Auto-saved ${previousLineupResult.rows.length} players from previous match`);
      }

      console.log('');
    }

    await client.query('COMMIT');
    
    console.log('✅ Auto-save completed!\n');

    // Show summary
    const summaryResult = await client.query(`
      SELECT 
        lm.id as match_id,
        lm.match_description,
        ft.team_name,
        COUNT(tpxi.id) as players_count,
        MAX(tpxi.created_at) as last_saved
      FROM league_matches lm
      CROSS JOIN fantasy_teams ft
      LEFT JOIN team_playing_xi tpxi ON tpxi.team_id = ft.id AND tpxi.match_id = lm.id
      WHERE lm.league_id = 84
      AND ft.league_id = 84
      AND lm.match_start <= NOW()
      GROUP BY lm.id, lm.match_description, ft.team_name
      ORDER BY lm.id, ft.team_name
      LIMIT 20
    `);

    console.log('Summary of Playing XI for locked matches:');
    console.table(summaryResult.rows);

    client.release();
    pool.end();

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    client.release();
    pool.end();
  }
}

autoSavePlayingXIForLockedMatches();
