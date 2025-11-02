// src/controllers/api/homeApiController.js
import { db } from '../../config/database.js';

export const getHomeData = async (req, res) => {
  try {
    const leaguesResult = await db.query(`
      SELECT 
        fl.*,
        t.name as tournament_name,
        t.type as tournament_type,
        t.end_date as tournament_end_date,
        CASE 
          WHEN t.end_date IS NULL THEN 'unknown'
          WHEN EXTRACT(EPOCH FROM NOW()) * 1000 < t.end_date THEN 'ongoing'
          ELSE 'completed'
        END as league_status,
        COALESCE(COUNT(DISTINCT ft.id), 0)::integer as teams_added
      FROM fantasy_leagues fl
      LEFT JOIN tournaments t ON fl.tournament_id = t.series_id
      LEFT JOIN fantasy_teams ft ON fl.id = ft.league_id
      GROUP BY fl.id, t.name, t.type, t.end_date
      ORDER BY fl.id DESC
    `);
    const tournamentsResult = await db.query('SELECT * FROM tournaments ORDER BY series_id DESC');
    
    res.json({
      leagues: leaguesResult.rows,
      tournaments: tournamentsResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error loading data' });
  }
};

export const getLeagues = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        fl.*,
        t.name as tournament_name,
        t.type as tournament_type,
        t.end_date as tournament_end_date,
        CASE 
          WHEN t.end_date IS NULL THEN 'unknown'
          WHEN EXTRACT(EPOCH FROM NOW()) * 1000 < t.end_date THEN 'ongoing'
          ELSE 'completed'
        END as league_status,
        COALESCE(COUNT(DISTINCT ft.id), 0)::integer as teams_added
      FROM fantasy_leagues fl
      LEFT JOIN tournaments t ON fl.tournament_id = t.series_id
      LEFT JOIN fantasy_teams ft ON fl.id = ft.league_id
      GROUP BY fl.id, t.name, t.type, t.end_date
      ORDER BY fl.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error loading leagues' });
  }
};

export const getTournaments = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tournaments ORDER BY series_id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error loading tournaments' });
  }
};