// src/controllers/api/fantasyApiController.js
import { db } from '../../config/database.js';

export const createFantasyLeague = async (req, res) => {
  const { 
    leagueName, 
    teamCount, 
    squadSize, 
    privacy, 
    description, 
    tournamentId, 
    userEmail, 
    userName,
    transferLimit = 10  // New field with default value
  } = req.body;
  
  console.log('Request Body:', req.body);
  
  try {
    // Validate tournament exists and get dates
    const tournamentResult = await db.query(
      'SELECT series_id, start_date, end_date, name as tournament_name FROM tournaments WHERE series_id = $1',
      [tournamentId]
    );

    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Tournament not found' 
      });
    }

    const tournament = tournamentResult.rows[0];

    // Convert millisecond timestamps to PostgreSQL timestamps
    const startDate = tournament.start_date ? new Date(parseInt(tournament.start_date)) : null;
    const endDate = tournament.end_date ? new Date(parseInt(tournament.end_date)) : null;

    // Generate a unique code for private leagues
    const leagueCode = privacy === 'private' ? generateLeagueCode() : null;
    
    // Validate squad size (15-20)
    const validSquadSize = squadSize && squadSize >= 15 && squadSize <= 20 ? squadSize : 15;
    
    // Validate transfer limit (5-20)
    const validTransferLimit = transferLimit && transferLimit >= 5 && transferLimit <= 20 ? transferLimit : 10;
    
    // Start transaction
    await db.query('BEGIN');
    
    // Create the league with new fields
    const leagueResult = await db.query(
      `INSERT INTO fantasy_leagues 
        (league_name, team_count, squad_size, privacy, description, tournament_id, league_code, created_by, start_date, end_date, transfer_limit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING id, league_code, start_date, end_date`,
      [leagueName, teamCount, validSquadSize, privacy, description, tournamentId, leagueCode, userEmail, 
       startDate, endDate, validTransferLimit]
    );

    const leagueData = leagueResult.rows[0];
    
    // Automatically add the creator as the first team
    const teamName = userName ? `${userName}'s Team` : `${userEmail}'s Team`;
    await db.query(
      `INSERT INTO fantasy_teams (league_id, team_name, team_owner)
       VALUES ($1, $2, $3)`,
      [leagueData.id, teamName, userEmail || userName || 'Creator']
    );

    // Auto-create league_matches entries from tournament fixtures
    const fixturesResult = await db.query(
      `SELECT match_id, start_time as start_date, match_description
       FROM matches 
       WHERE series_id = $1 
       ORDER BY start_time, match_id`,
      [tournamentId]
    );

    let matchesCreated = 0;
    for (const fixture of fixturesResult.rows) {
      try {
        // Convert start_time to timestamp if it's a string
        const matchStart = fixture.start_date ? new Date(parseInt(fixture.start_date)) : null;
        
        await db.query(
          `INSERT INTO league_matches (league_id, match_id, match_start, match_description)
           VALUES ($1, $2, $3, $4)`,
          [leagueData.id, fixture.match_id, matchStart, fixture.match_description]
        );
        matchesCreated++;
      } catch (insertErr) {
        // Log but don't fail if a match already exists
        console.warn(`Skipping duplicate match ${fixture.match_id}:`, insertErr.message);
      }
    }
    
    // Commit transaction
    await db.query('COMMIT');
    
    res.json({ 
      success: true, 
      leagueId: leagueData.id,
      leagueCode: leagueData.league_code,
      startDate: leagueData.start_date,
      endDate: leagueData.end_date,
      transferLimit: validTransferLimit,
      matchesCreated,
      message: `League created successfully! ${matchesCreated} matches added. You have been added as the first member.`
    });
  } catch (err) {
    // Rollback transaction on error
    await db.query('ROLLBACK');
    console.error('Error creating fantasy league:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error creating fantasy league',
      details: err.message 
    });
  }
};

// Helper function to generate unique league code
function generateLeagueCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

export const getLeague = async (req, res) => {
  const { leagueId } = req.params;

  if (!leagueId || isNaN(leagueId)) {
    return res.status(400).json({ error: 'Invalid or missing league ID' });
  }

  try {
    const leagueResult = await db.query('SELECT * FROM fantasy_leagues WHERE id = $1', [leagueId]);
    const leagueData = leagueResult.rows[0];

    if (!leagueData) {
      return res.status(404).json({ error: 'League not found' });
    }

    const teamsResult = await db.query('SELECT * FROM fantasy_teams WHERE league_id = $1 ORDER BY id', [leagueId]);
    
    res.json({ 
      ...leagueData,
      teams: teamsResult.rows
    });
  } catch (err) {
    console.error('Error fetching league data:', err);
    res.status(500).json({ error: 'Error fetching league data' });
  }
};

export const setupTeams = async (req, res) => {
  const { leagueId } = req.params;
  const { teams, teamCount } = req.body;

  console.log('Request Body:', req.body);

  // Validate
  if (!teams || !Array.isArray(teams)) {
    return res.status(400).json({ error: 'Invalid teams data' });
  }

  for (let team of teams) {
    if (!team.teamName || !team.teamOwner) {
      return res.status(400).json({ error: 'Team names and owners cannot be empty' });
    }
  }

  try {
    for (let team of teams) {
      await db.query(
        `INSERT INTO fantasy_teams (league_id, team_name, team_owner) VALUES ($1, $2, $3)`,
        [leagueId, team.teamName, team.teamOwner]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error setting up teams:', err);
    res.status(500).json({ error: 'Error setting up teams' });
  }
};

export const submitSquads = async (req, res) => {
  const { leagueId } = req.params;
  const { squads, teamIds } = req.body;

  try {
    for (const teamId of teamIds) {
      const squad = squads[teamId];
      const players = squad.players;
      const captainIndex = parseInt(squad.captain, 10);
      const viceCaptainIndex = parseInt(squad.viceCaptain, 10);

      for (let i = 0; i < players.length; i++) {
        const playerName = players[i].trim();
        if (playerName) {
          const isCaptain = i === captainIndex;
          const isViceCaptain = i === viceCaptainIndex;

          await db.query(
            `INSERT INTO fantasy_squads (league_id, team_id, player_name, is_captain, is_vice_captain)
             VALUES ($1, $2, $3, $4, $5)`,
            [leagueId, teamId, playerName, isCaptain, isViceCaptain]
          );
        }
      }
    }

    res.json({ success: true, message: 'Squads submitted successfully' });
  } catch (err) {
    console.error('Error submitting squads:', err);
    res.status(500).json({ error: 'Error submitting squads' });
  }
};