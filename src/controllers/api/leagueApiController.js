// src/controllers/api/leagueApiController.js
import { db } from '../../config/database.js';

export const getPublicLeagues = async (req, res) => {
  const userEmail = req.query.userEmail;

  try {
    // Fetch public leagues that user hasn't joined yet
    const query = userEmail
      ? `SELECT 
          fl.*,
          t.name as tournament_name,
          t.type as tournament_type,
          t.end_date as tournament_end_date,
          CASE 
            WHEN t.end_date IS NULL THEN 'unknown'
            WHEN EXTRACT(EPOCH FROM NOW()) * 1000 < t.end_date THEN 'ongoing'
            ELSE 'completed'
          END as league_status,
          COALESCE(COUNT(DISTINCT ft.id), 0)::integer as current_participants,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM fantasy_teams 
              WHERE league_id = fl.id AND team_owner = $1
            ) THEN true 
            ELSE false 
          END as is_member
        FROM fantasy_leagues fl
        LEFT JOIN tournaments t ON fl.tournament_id = t.series_id
        LEFT JOIN fantasy_teams ft ON fl.id = ft.league_id
        WHERE fl.privacy = 'public'
        GROUP BY fl.id, t.name, t.type, t.end_date
        ORDER BY fl.created_at DESC`
      : `SELECT 
          fl.*,
          t.name as tournament_name,
          t.type as tournament_type,
          t.end_date as tournament_end_date,
          CASE 
            WHEN t.end_date IS NULL THEN 'unknown'
            WHEN EXTRACT(EPOCH FROM NOW()) * 1000 < t.end_date THEN 'ongoing'
            ELSE 'completed'
          END as league_status,
          COALESCE(COUNT(DISTINCT ft.id), 0)::integer as current_participants,
          false as is_member
        FROM fantasy_leagues fl
        LEFT JOIN tournaments t ON fl.tournament_id = t.series_id
        LEFT JOIN fantasy_teams ft ON fl.id = ft.league_id
        WHERE fl.privacy = 'public'
        GROUP BY fl.id, t.name, t.type, t.end_date
        ORDER BY fl.created_at DESC`;

    const result = userEmail 
      ? await db.query(query, [userEmail])
      : await db.query(query);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching public leagues:', err);
    res.status(500).json({ error: 'Error fetching public leagues' });
  }
};

export const getLeagueDetails = async (req, res) => {
  const leagueId = req.params.id;

  try {
    // Fetch league details with tournament name
    const leagueResult = await db.query(
      `SELECT 
        fl.*,
        t.name as tournament_name,
        t.type as tournament_type,
        t.year as tournament_year,
        t.end_date as tournament_end_date,
        CASE 
          WHEN t.end_date IS NULL THEN 'unknown'
          WHEN EXTRACT(EPOCH FROM NOW()) * 1000 < t.end_date THEN 'ongoing'
          ELSE 'completed'
        END as league_status
      FROM fantasy_leagues fl
      LEFT JOIN tournaments t ON fl.tournament_id = t.series_id
      WHERE fl.id = $1`, 
      [leagueId]
    );
    const league = leagueResult.rows[0];

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    const teamsResult = await db.query(
      `SELECT * FROM fantasy_teams WHERE league_id = $1 ORDER BY id`, 
      [leagueId]
    );
    const teams = teamsResult.rows;

    res.json({ league, teams });
  } catch (err) {
    console.error('Error loading league details:', err);
    res.status(500).json({ error: 'Error loading league details' });
  }
};

export const joinLeague = async (req, res) => {
  const leagueId = req.params.id;
  const { userEmail, userName, leagueCode } = req.body;

  if (!userEmail || !userName) {
    return res.status(400).json({ error: 'User email and name are required' });
  }

  try {
    // Fetch league details
    const leagueResult = await db.query(
      'SELECT * FROM fantasy_leagues WHERE id = $1',
      [leagueId]
    );
    const league = leagueResult.rows[0];

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Check if league is private and validate code
    if (league.privacy === 'private') {
      if (!leagueCode) {
        return res.status(400).json({ error: 'League code is required for private leagues' });
      }
      if (league.league_code !== leagueCode) {
        return res.status(403).json({ error: 'Invalid league code' });
      }
    }

    // Check if user is already in the league
    const existingTeamResult = await db.query(
      'SELECT * FROM fantasy_teams WHERE league_id = $1 AND team_owner = $2',
      [leagueId, userEmail]
    );

    if (existingTeamResult.rows.length > 0) {
      return res.status(400).json({ error: 'You are already a member of this league' });
    }

    // Check if league is full
    const teamsCountResult = await db.query(
      'SELECT COUNT(*) as count FROM fantasy_teams WHERE league_id = $1',
      [leagueId]
    );
    const currentTeamsCount = parseInt(teamsCountResult.rows[0].count);

    if (currentTeamsCount >= league.team_count) {
      return res.status(400).json({ error: 'League is full' });
    }

    // Add user to the league
    const teamName = `${userName}'s Team`;
    await db.query(
      'INSERT INTO fantasy_teams (league_id, team_name, team_owner) VALUES ($1, $2, $3)',
      [leagueId, teamName, userEmail]
    );

    res.json({
      success: true,
      message: 'Successfully joined the league!',
      teamName
    });
  } catch (err) {
    console.error('Error joining league:', err);
    res.status(500).json({ error: 'Error joining league' });
  }
};
export const joinLeagueByCode = async (req, res) => {
  const { leagueCode, userEmail, userName } = req.body;

  if (!leagueCode || !userEmail || !userName) {
    return res.status(400).json({ error: 'League code, user email, and name are required' });
  }

  try {
    // Find league by code
    const leagueResult = await db.query(
      `SELECT 
        fl.*,
        t.name as tournament_name,
        t.type as tournament_type
      FROM fantasy_leagues fl
      LEFT JOIN tournaments t ON fl.tournament_id = t.series_id
      WHERE fl.league_code = $1`,
      [leagueCode.toUpperCase()]
    );

    if (leagueResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid league code. Please check and try again.' });
    }

    const league = leagueResult.rows[0];

    // Check if user is already in the league
    const existingTeamResult = await db.query(
      'SELECT * FROM fantasy_teams WHERE league_id = $1 AND team_owner = $2',
      [league.id, userEmail]
    );

    if (existingTeamResult.rows.length > 0) {
      return res.status(400).json({ error: 'You are already a member of this league' });
    }

    // Check if league is full
    const teamsCountResult = await db.query(
      'SELECT COUNT(*) as count FROM fantasy_teams WHERE league_id = $1',
      [league.id]
    );
    const currentTeamsCount = parseInt(teamsCountResult.rows[0].count);

    if (currentTeamsCount >= league.team_count) {
      return res.status(400).json({ error: 'This league is already full' });
    }

    // Add user to the league
    const teamName = `${userName}'s Team`;
    await db.query(
      'INSERT INTO fantasy_teams (league_id, team_name, team_owner) VALUES ($1, $2, $3)',
      [league.id, teamName, userEmail]
    );

    res.json({
      success: true,
      message: `Successfully joined "${league.league_name}"!`,
      league: {
        id: league.id,
        name: league.league_name,
        tournamentName: league.tournament_name
      },
      teamName
    });
  } catch (err) {
    console.error('Error joining league by code:', err);
    res.status(500).json({ error: 'Error joining league' });
  }
};

export const deleteLeague = async (req, res) => {
  const leagueId = req.params.leagueId;
  const { userEmail } = req.body;

  if (!leagueId) {
    return res.status(400).json({ error: 'League ID is required' });
  }

  try {
    // Check if league exists and get tournament info
    const leagueResult = await db.query(
      `SELECT 
        fl.*,
        t.end_date as tournament_end_date,
        t.name as tournament_name
      FROM fantasy_leagues fl
      LEFT JOIN tournaments t ON fl.tournament_id = t.series_id
      WHERE fl.id = $1`,
      [leagueId]
    );

    if (leagueResult.rows.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    const league = leagueResult.rows[0];

    // Check if user is the creator
    if (userEmail && league.created_by !== userEmail) {
      return res.status(403).json({ error: 'Only the league creator can delete this league' });
    }

    // Check if tournament has ended
    if (league.tournament_end_date) {
      const currentTime = Date.now();
      const tournamentEndTime = parseInt(league.tournament_end_date);
      
      if (currentTime < tournamentEndTime) {
        const endDate = new Date(tournamentEndTime).toLocaleDateString();
        return res.status(400).json({ 
          error: `Cannot delete league. The tournament "${league.tournament_name}" is still ongoing and will end on ${endDate}. Please wait until the tournament ends.` 
        });
      }
    }

    // Delete related data first (due to foreign key constraints)
    // Delete all fantasy teams in this league
    await db.query('DELETE FROM fantasy_teams WHERE league_id = $1', [leagueId]);

    // Delete the league
    await db.query('DELETE FROM fantasy_leagues WHERE id = $1', [leagueId]);

    res.json({ 
      success: true, 
      message: 'League deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting league:', error);
    res.status(500).json({ error: 'Failed to delete league' });
  }
};

/**
 * ============================================================================
 * NEW ENDPOINTS FOR EXTENDED FUNCTIONALITY
 * ============================================================================
 */

/**
 * Get all matches for a league
 * GET /api/league/:id/matches
 */
export const getLeagueMatches = async (req, res) => {
  const leagueId = req.params.id;
  const { status = 'all' } = req.query; // 'all', 'upcoming', 'active', 'completed'

  try {
    let query = `
      SELECT 
        lm.id,
        lm.match_id AS tournament_match_id,
        lm.match_start,
        lm.match_description,
        lm.is_active,
        lm.is_completed,
        CASE 
          WHEN NOW() >= lm.match_start THEN true 
          ELSE false 
        END AS is_locked,
        EXTRACT(EPOCH FROM (lm.match_start - NOW())) AS seconds_until_start
      FROM league_matches lm
      WHERE lm.league_id = $1
    `;

    // Add status filter
    if (status === 'upcoming') {
      query += ` AND lm.is_completed = false AND NOW() < lm.match_start`;
    } else if (status === 'active') {
      query += ` AND lm.is_active = true AND lm.is_completed = false`;
    } else if (status === 'completed') {
      query += ` AND lm.is_completed = true`;
    }

    query += ` ORDER BY lm.match_start ASC`;

    const result = await db.query(query, [leagueId]);

    res.json({
      success: true,
      data: {
        matches: result.rows,
        total: result.rows.length,
        upcoming: result.rows.filter(m => !m.is_completed && !m.is_locked).length,
        completed: result.rows.filter(m => m.is_completed).length
      }
    });
  } catch (err) {
    console.error('Error fetching league matches:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching league matches' 
    });
  }
};

/**
 * Get leaderboard for a league
 * GET /api/league/:id/leaderboard
 */
export const getLeaderboard = async (req, res) => {
  const leagueId = req.params.id;

  try {
    const result = await db.query(
      `SELECT * FROM league_leaderboard WHERE league_id = $1 ORDER BY rank`,
      [leagueId]
    );

    res.json({
      success: true,
      data: {
        leaderboard: result.rows,
        total: result.rows.length
      }
    });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching leaderboard' 
    });
  }
};

/**
 * Get top performers for a league/tournament
 * GET /api/league/:id/top-performers
 */
export const getTopPerformers = async (req, res) => {
  const leagueId = req.params.id;
  const { limit = 20, role = '' } = req.query;

  try {
    let query = `
      SELECT * FROM tournament_top_performers 
      WHERE league_id = $1
    `;

    const params = [leagueId];

    // Role filter
    if (role) {
      query += ` AND player_role ILIKE $2`;
      params.push(`%${role}%`);
    }

    query += ` ORDER BY total_fantasy_points DESC LIMIT ${parseInt(limit)}`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: {
        players: result.rows,
        total: result.rows.length
      }
    });
  } catch (err) {
    console.error('Error fetching top performers:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching top performers' 
    });
  }
};

/**
 * Get detailed match breakdown for a team
 * GET /api/league/:leagueId/team/:teamId/match-breakdown
 */
export const getTeamMatchBreakdown = async (req, res) => {
  const { leagueId, teamId } = req.params;

  try {
    const result = await db.query(
      `SELECT 
        lm.id AS match_id,
        lm.match_id AS tournament_match_id,
        lm.match_start,
        lm.match_description,
        lm.is_completed,
        tms.total_points,
        tms.rank_in_match,
        tms.captain_points,
        tms.vice_captain_points,
        tms.regular_points
      FROM league_matches lm
      LEFT JOIN team_match_scores tms ON lm.id = tms.match_id AND tms.team_id = $1
      WHERE lm.league_id = $2
      ORDER BY lm.match_start ASC`,
      [teamId, leagueId]
    );

    // Calculate cumulative points
    let cumulative = 0;
    const matchesWithCumulative = result.rows.map(match => {
      if (match.total_points) {
        cumulative += match.total_points;
      }
      return {
        ...match,
        cumulative_points: cumulative
      };
    });

    res.json({
      success: true,
      data: {
        matches: matchesWithCumulative,
        total: matchesWithCumulative.length,
        totalPoints: cumulative
      }
    });
  } catch (err) {
    console.error('Error fetching match breakdown:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching match breakdown' 
    });
  }
};

/**
 * Get league info card summary
 * GET /api/league/:id/info
 */
export const getLeagueInfo = async (req, res) => {
  const leagueId = req.params.id;

  try {
    const result = await db.query(
      `SELECT 
        fl.id,
        fl.league_name,
        fl.league_code,
        fl.created_at,
        fl.created_by,
        fl.team_count AS max_teams,
        fl.squad_size,
        fl.transfer_limit,
        fl.privacy,
        fl.description,
        t.name AS tournament_name,
        t.type AS tournament_type,
        t.year AS tournament_year,
        t.start_date,
        t.end_date,
        COUNT(DISTINCT ft.id) AS current_teams,
        CASE 
          WHEN t.end_date IS NULL THEN 'unknown'
          WHEN EXTRACT(EPOCH FROM NOW()) * 1000 < t.start_date THEN 'upcoming'
          WHEN EXTRACT(EPOCH FROM NOW()) * 1000 > t.end_date THEN 'completed'
          ELSE 'ongoing'
        END AS league_status
      FROM fantasy_leagues fl
      LEFT JOIN tournaments t ON fl.tournament_id = t.series_id
      LEFT JOIN fantasy_teams ft ON fl.id = ft.league_id
      WHERE fl.id = $1
      GROUP BY fl.id, fl.league_name, fl.league_code, fl.created_at, fl.created_by, 
               fl.team_count, fl.squad_size, fl.transfer_limit, fl.privacy, fl.description,
               t.name, t.type, t.year, t.start_date, t.end_date`,
      [leagueId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'League not found'
      });
    }

    // Get match statistics separately
    const matchStats = await db.query(
      `SELECT 
        COUNT(*) AS total_matches,
        COUNT(CASE WHEN is_completed = true THEN 1 END) AS completed_matches
      FROM league_matches
      WHERE league_id = $1`,
      [leagueId]
    );

    const leagueData = result.rows[0];
    const stats = matchStats.rows[0] || { total_matches: 0, completed_matches: 0 };
    const upcomingMatches = parseInt(stats.total_matches) - parseInt(stats.completed_matches);

    res.json({
      success: true,
      data: {
        ...leagueData,
        current_teams: parseInt(leagueData.current_teams),
        total_matches: parseInt(stats.total_matches),
        completed_matches: parseInt(stats.completed_matches),
        upcoming_matches: upcomingMatches
      }
    });
  } catch (err) {
    console.error('Error fetching league info:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching league info' 
    });
  }
};
