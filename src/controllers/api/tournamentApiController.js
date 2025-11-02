// src/controllers/api/tournamentApiController.js
import { db } from '../../config/database.js';
import { fetchFromApi, refreshTournamentData } from '../../services/apiService.js';

// Get series based on type and year
export const getSeries = async (req, res) => {
  const { type, year } = req.query;

  if (!type || !year) {
    return res.status(400).json({ error: 'Missing type or year parameter' });
  }

  try {
    const url = `https://cricbuzz-cricket.p.rapidapi.com/series/v1/${type}`;
    const response = await fetchFromApi(url);
    const seriesData = response.seriesMapProto || [];

    const filteredSeries = seriesData.flatMap(item => {
      return item.series.filter(series => {
        const startYear = new Date(parseInt(series.startDt, 10)).getFullYear();
        return startYear === parseInt(year, 10);
      }).map(series => ({
        id: series.id,
        name: series.name,
        startDt: series.startDt,
        endDt: series.endDt
      }));
    });

    res.json({ series: filteredSeries });
  } catch (error) {
    console.error('Error fetching series:', error);
    res.status(500).json({ error: 'Failed to fetch series' });
  }
};

// Add tournament to database
export const addTournament = async (req, res) => {
  const { seriesType: type, year, seriesId, seriesName: tournamentName, startDt, endDt } = req.body;

  try {
    // Check if the tournament already exists
    const existingTournament = await db.query(
      'SELECT * FROM tournaments WHERE series_id = $1',
      [seriesId]
    );

    if (existingTournament.rows.length > 0) {
      return res.status(409).json({ error: 'Tournament already exists' });
    }

    // Insert the new tournament with dates
    const result = await db.query(
      'INSERT INTO tournaments (name, type, year, series_id, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [tournamentName, type, year, seriesId, startDt, endDt]
    );

    const newTournament = result.rows[0];
    console.log('New Tournament:', newTournament);
    
    res.json({ 
      success: true, 
      tournament: newTournament,
      message: 'Tournament added successfully'
    });
  } catch (error) {
    console.error('Error saving tournament:', error);
    res.status(500).json({ error: 'Error saving tournament' });
  }
};

// Refresh tournament data
export const refreshTournament = async (req, res) => {
  const { tournamentId } = req.params;
  
  try {
    await refreshTournamentData(tournamentId);
    res.json({ 
      success: true, 
      message: 'Tournament data refreshed successfully' 
    });
  } catch (error) {
    console.error('Error refreshing tournament data:', error);
    res.status(500).json({ error: 'Error refreshing tournament data' });
  }
};

// Get tournament details
export const getTournamentHome = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const result = await db.query('SELECT * FROM tournaments WHERE series_id = $1', [tournamentId]);
    const tournaments = result.rows;
    
    if (tournaments.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    res.json({ tournaments, tournamentId });
  } catch (error) {
    console.error('Error fetching tournament data:', error);
    res.status(500).json({ error: 'Error fetching tournament data' });
  }
};

// Get tournament fixtures
export const getTournamentFixtures = async (req, res) => {
  const { tournamentId } = req.params;
  
  try {
    const updatedMatchesResult = await db.query(
      'SELECT * FROM matches WHERE series_id = $1 ORDER BY match_id', 
      [tournamentId]
    );
    
    // Format dates
    const matches = updatedMatchesResult.rows.map(match => {
      if (match.start_time) {
        const date = new Date(parseInt(match.start_time, 10));
        return {
          ...match,
          start_time_formatted: `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`,
          start_time_original: match.start_time
        };
      }
      return match;
    });
    
    res.json({ matches, tournamentId });
  } catch (error) {
    console.error('Error fetching or processing match data:', error);
    res.status(500).json({ error: 'Error fetching or processing match data' });
  }
};

// Get tournament squads
export const getTournamentSquads = async (req, res) => {
  const { tournamentId } = req.params;
  const { squad } = req.query || {};

  try {
    let query = `
      SELECT squad_players.name, squad_players.role, squads.squad_type
      FROM squad_players 
      JOIN squads ON squad_players.squad_id = squads.squad_id 
      WHERE squads.series_id = $1`;
    const params = [tournamentId];

    if (squad) {
      query += ` AND squads.squad_type = $2`;
      params.push(squad);
    }

    const playersResult = await db.query(query, params);
    const players = playersResult.rows;

    const squadsResult = await db.query(
      `SELECT DISTINCT squad_type FROM squads WHERE series_id = $1`,
      [tournamentId]
    );
    const squadNames = squadsResult.rows.map(row => row.squad_type);

    // Group players by squad_type
    const squadsWithPlayers = squadNames.map(squadName => ({
      squadName,
      players: players.filter(player => player.squad_type === squadName)
    }));

    res.json({
      squadsWithPlayers,
      squadNames,
      tournamentId,
      selectedSquad: squad || '',
    });
  } catch (error) {
    console.error('Error fetching squad players:', error);
    res.status(500).json({ error: 'Error fetching squad players' });
  }
};

// Get squad players (filtered)
export const getSquadPlayers = async (req, res) => {
  const { tournamentId } = req.params;
  const { squad } = req.query;

  try {
    let query = `
      SELECT squad_players.player_id, squad_players.name, squad_players.role, squads.squad_type 
      FROM squad_players 
      JOIN squads ON squad_players.squad_id = squads.squad_id 
      WHERE squads.series_id = $1`;
    const params = [tournamentId];

    if (squad) {
      query += ` AND squads.squad_type = $2`;
      params.push(squad);
    }

    const playersResult = await db.query(query, params);
    const players = playersResult.rows;

    const squadsResult = await db.query(
      `SELECT DISTINCT squad_type FROM squads WHERE series_id = $1`,
      [tournamentId]
    );
    const squadNames = squadsResult.rows.map(row => row.squad_type);

    res.json({ 
      players, 
      squadNames, 
      tournamentId,
      selectedSquad: squad || ''
    });
  } catch (error) {
    console.error('Error fetching squad players:', error);
    res.status(500).json({ error: 'Error fetching squad players' });
  }
};
// Delete tournament
export const deleteTournament = async (req, res) => {
  const tournamentId = req.params.tournamentId;

  if (!tournamentId) {
    return res.status(400).json({ error: 'Tournament ID is required' });
  }

  try {
    // Check if tournament exists
    const tournamentCheck = await db.query(
      'SELECT * FROM tournaments WHERE series_id = $1',
      [tournamentId]
    );

    if (tournamentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const tournament = tournamentCheck.rows[0];

    // Check if tournament has ended
    if (tournament.end_date) {
      const currentTime = Date.now();
      const tournamentEndTime = parseInt(tournament.end_date);
      
      if (currentTime < tournamentEndTime) {
        const endDate = new Date(tournamentEndTime).toLocaleDateString();
        return res.status(400).json({ 
          error: `Cannot delete tournament. Tournament is still active and will end on ${endDate}. Please wait until the tournament ends.` 
        });
      }
    }

    // Check if any leagues are using this tournament
    const leaguesCheck = await db.query(
      'SELECT COUNT(*) as count FROM fantasy_leagues WHERE tournament_id = $1',
      [tournamentId]
    );

    const leagueCount = parseInt(leaguesCheck.rows[0].count);

    if (leagueCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete tournament. ${leagueCount} active league(s) are using this tournament. Please wait until the league(s) end before deleting.` 
      });
    }

    // Delete related data first (due to foreign key constraints)
    // Delete squad_players through squads relationship
    await db.query(
      'DELETE FROM squad_players WHERE squad_id IN (SELECT squad_id FROM squads WHERE series_id = $1)',
      [tournamentId]
    );
    await db.query('DELETE FROM squads WHERE series_id = $1', [tournamentId]);
    await db.query('DELETE FROM matches WHERE series_id = $1', [tournamentId]);

    // Delete the tournament
    await db.query('DELETE FROM tournaments WHERE series_id = $1', [tournamentId]);

    res.json({ 
      success: true, 
      message: 'Tournament deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
};
