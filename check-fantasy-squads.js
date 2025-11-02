import db from './src/config/database.js';

const leagueId = 83;

console.log('Checking fantasy_squads for league', leagueId);

db.query(`
  SELECT 
    league_id,
    team_id,
    COUNT(*) as player_count,
    STRING_AGG(player_name, ', ') as players
  FROM fantasy_squads
  WHERE league_id = $1
  GROUP BY league_id, team_id
  ORDER BY team_id
`, [leagueId])
  .then((result) => {
    console.log('\n=== Fantasy Squads by Team ===\n');
    if (result.rows.length === 0) {
      console.log('❌ No fantasy_squads found for league', leagueId);
    } else {
      console.table(result.rows);
      
      // Show detailed data for first team
      const firstTeam = result.rows[0];
      return db.query(`
        SELECT player_id, player_name, role, squad_name
        FROM fantasy_squads
        WHERE league_id = $1 AND team_id = $2
        LIMIT 5
      `, [leagueId, firstTeam.team_id]);
    }
  })
  .then((detailResult) => {
    if (detailResult && detailResult.rows) {
      console.log('\n=== Sample Players ===\n');
      console.table(detailResult.rows);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
