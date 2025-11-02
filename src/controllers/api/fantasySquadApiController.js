import pool from '../../config/database.js';

/**
 * Get all players already selected in a league
 * Returns a list of player IDs that are unavailable
 */
export const getUnavailablePlayers = async (req, res) => {
  const { leagueId } = req.params;

  try {
    const query = `
      SELECT DISTINCT player_id, player_name, squad_name, team_id
      FROM fantasy_squads
      WHERE league_id = $1 AND player_id IS NOT NULL
      ORDER BY player_name
    `;

    const result = await pool.query(query, [leagueId]);

    res.json({
      success: true,
      data: {
        unavailablePlayers: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching unavailable players:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unavailable players'
    });
  }
};

/**
 * Get a team's current squad
 */
export const getTeamSquad = async (req, res) => {
  const { leagueId, teamId } = req.params;

  console.log('🔍 getTeamSquad called with:', { leagueId, teamId });

  try {
    const query = `
      SELECT DISTINCT ON (fs.id)
        fs.id,
        fs.player_id,
        fs.player_name,
        fs.squad_name,
        fs.role,
        fs.is_captain,
        fs.is_vice_captain,
        fs.created_at,
        sp.role as player_role
      FROM fantasy_squads fs
      LEFT JOIN squad_players sp ON sp.player_id = CAST(fs.player_id AS BIGINT)
      WHERE fs.league_id = $1 AND fs.team_id = $2
      ORDER BY fs.id, fs.created_at
    `;

    const result = await pool.query(query, [leagueId, teamId]);
    
    console.log(`📊 Query returned ${result.rows.length} rows`);
    if (result.rows.length > 0) {
      console.log('Sample row:', result.rows[0]);
    } else {
      console.log('⚠️  No rows found. Checking if data exists...');
      const checkQuery = await pool.query('SELECT COUNT(*) as count, league_id, team_id FROM fantasy_squads WHERE league_id = $1 GROUP BY league_id, team_id', [leagueId]);
      console.log('Data in fantasy_squads for this league:', checkQuery.rows);
    }

    // Use player_role from squad_players table if available, otherwise use stored role
    const squad = result.rows.map(row => ({
      ...row,
      role: row.player_role || row.role
    }));

    res.json({
      success: true,
      data: {
        squad
      }
    });
  } catch (error) {
    console.error('Error fetching team squad:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team squad'
    });
  }
};

/**
 * Save/Update a team's squad
 * Handles race conditions using database-level unique constraint
 */
export const saveTeamSquad = async (req, res) => {
  const { leagueId, teamId } = req.params;
  const { players, captain, viceCaptain } = req.body;

  const client = await pool.connect();

  try {
    // Get the league's squad size
    const leagueQuery = await client.query(
      'SELECT squad_size FROM fantasy_leagues WHERE id = $1',
      [leagueId]
    );

    if (leagueQuery.rows.length === 0) {
      client.release();
      return res.status(404).json({
        success: false,
        error: 'League not found'
      });
    }

    const requiredSquadSize = leagueQuery.rows[0].squad_size || 15;

    // Validation
    if (!Array.isArray(players) || players.length !== requiredSquadSize) {
      client.release();
      return res.status(400).json({
        success: false,
        error: `Squad must have exactly ${requiredSquadSize} players for this league`
      });
    }

    // Captain and vice-captain are optional during squad submission
    // They will be set later during team management
    
    // Validate captain and vice-captain are different if both provided
    if (captain && viceCaptain && captain.player_id === viceCaptain.player_id) {
      client.release();
      return res.status(400).json({
        success: false,
        error: 'Captain and vice-captain must be different players'
      });
    }

    await client.query('BEGIN');

    // Delete existing squad for this team in this league
    await client.query(
      'DELETE FROM fantasy_squads WHERE league_id = $1 AND team_id = $2',
      [leagueId, teamId]
    );

    // Insert new squad
    const insertPromises = players.map(player => {
      // Captain and vice-captain are optional, default to false
      const isCaptain = captain && player.player_id === captain.player_id;
      const isViceCaptain = viceCaptain && player.player_id === viceCaptain.player_id;

      return client.query(
        `INSERT INTO fantasy_squads 
         (league_id, team_id, player_id, player_name, squad_name, role, is_captain, is_vice_captain, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          leagueId,
          teamId,
          player.player_id, // Use proper player_id
          player.name || player.player_name,
          player.squad_type || player.team || player.cricket_team, // Frontend sends squad_type
          player.role, // Store role
          isCaptain || false,
          isViceCaptain || false
        ]
      );
    });

    await Promise.all(insertPromises);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Squad saved successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');

    // Check if error is due to unique constraint violation (race condition)
    if (error.code === '23505' && error.constraint === 'idx_fantasy_squads_league_player') {
      // Extract player info from error message if possible
      const match = error.detail?.match(/Key \(league_id, player_id\)=\((\d+), ([^)]+)\)/);
      const conflictPlayerInfo = match ? `Player ${match[2]}` : 'One or more players';

      return res.status(409).json({
        success: false,
        error: `${conflictPlayerInfo} has already been selected by another team. Please refresh and try again.`,
        errorCode: 'PLAYER_ALREADY_SELECTED'
      });
    }

    console.error('Error saving squad:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save squad'
    });
  } finally {
    client.release();
  }
};

/**
 * Add a single player to a team's squad (optional - for incremental updates)
 */
export const addPlayerToSquad = async (req, res) => {
  const { leagueId, teamId } = req.params;
  const { player } = req.body;

  const MAX_SQUAD_SIZE = 20;

  if (!player || !player.name) {
    return res.status(400).json({
      success: false,
      error: 'Player information is required'
    });
  }

  try {
    // Check current squad size
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM fantasy_squads WHERE league_id = $1 AND team_id = $2',
      [leagueId, teamId]
    );

    if (parseInt(countResult.rows[0].count) >= MAX_SQUAD_SIZE) {
      return res.status(400).json({
        success: false,
        error: `Squad is full (maximum ${MAX_SQUAD_SIZE} players)`
      });
    }

    // Try to add the player
    await pool.query(
      `INSERT INTO fantasy_squads 
       (league_id, team_id, player_id, player_name, squad_name, role, is_captain, is_vice_captain, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        leagueId,
        teamId,
        player.player_id,
        player.name || player.player_name,
        player.squad_type || player.team || player.cricket_team, // Support all field names
        player.role,
        false,
        false
      ]
    );

    res.json({
      success: true,
      message: 'Player added to squad'
    });
  } catch (error) {
    // Check for unique constraint violation
    if (error.code === '23505' && error.constraint === 'idx_fantasy_squads_league_player') {
      return res.status(409).json({
        success: false,
        error: 'This player has already been selected by another team',
        errorCode: 'PLAYER_ALREADY_SELECTED'
      });
    }

    console.error('Error adding player to squad:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add player to squad'
    });
  }
};

/**
 * Remove a player from a team's squad
 */
export const removePlayerFromSquad = async (req, res) => {
  const { leagueId, teamId, playerId } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM fantasy_squads WHERE league_id = $1 AND team_id = $2 AND player_id = $3',
      [leagueId, teamId, playerId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Player not found in squad'
      });
    }

    res.json({
      success: true,
      message: 'Player removed from squad'
    });
  } catch (error) {
    console.error('Error removing player from squad:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove player from squad'
    });
  }
};
