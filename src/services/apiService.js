// src/services/apiService.js
// Updated: 2025-10-25
import axios from 'axios';
import { db } from '../config/database.js';

const RAPIDAPI_KEY = 'f8caabb8b1msh37ba48711d0db0ap100b7ajsnb96b28f37ac9';
const RAPIDAPI_HOST = 'cricbuzz-cricket.p.rapidapi.com';

export async function fetchFromApi(url) {
  const response = await axios.request({
    method: 'GET',
    url,
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    }
  });
  return response.data;
}

export async function refreshTournamentData(tournamentId) {
  console.log(`\n🔄 Starting refresh for tournament ${tournamentId}...`);
  console.log(`DEBUG: refreshTournamentData function called at ${new Date().toISOString()}`);
  
  // 1. Fetch matches
  console.log('📊 Fetching matches...');
  const matchesUrl = `https://cricbuzz-cricket.p.rapidapi.com/series/v1/${tournamentId}`;
  const matchesData = await fetchFromApi(matchesUrl);
  const matches = matchesData.matchDetails || [];

  // Extract and update tournament dates
  if (matches.length > 0 && matches[0].matchDetailsMap && matches[0].matchDetailsMap.match) {
    const firstMatch = matches[0].matchDetailsMap.match[0].matchInfo;
    if (firstMatch.seriesStartDt && firstMatch.seriesEndDt) {
      try {
        await db.query(
          'UPDATE tournaments SET start_date = $1, end_date = $2 WHERE series_id = $3',
          [firstMatch.seriesStartDt, firstMatch.seriesEndDt, tournamentId]
        );
        console.log(`📅 Updated tournament dates: ${new Date(parseInt(firstMatch.seriesStartDt)).toLocaleDateString()} - ${new Date(parseInt(firstMatch.seriesEndDt)).toLocaleDateString()}`);
      } catch (dateError) {
        console.error('⚠️  Error updating tournament dates:', dateError.message);
      }
    }
  }

  // 2. Update matches in DB
  const currentMatchesResult = await db.query('SELECT * FROM matches WHERE series_id = $1', [tournamentId]);
  const currentMatches = currentMatchesResult.rows;

  let matchesUpdated = 0;
  let matchesInserted = 0;

  for (const item of matches) {
    if (item.matchDetailsMap && item.matchDetailsMap.match) {
      for (const matchItem of item.matchDetailsMap.match) {
        const matchInfo = matchItem.matchInfo;
        if (matchInfo) {
          const series_id = matchInfo.seriesId || null;
          const match_id = matchInfo.matchId;
          const team1 = matchInfo.team1 ? matchInfo.team1.teamName : 'N/A';
          const team2 = matchInfo.team2 ? matchInfo.team2.teamName : 'N/A';
          const start_time = matchInfo.startDate || null;
          const result = matchInfo.status || null;
          const match_description = matchInfo.matchDesc || null;

          const existingMatch = currentMatches.find(match => match.match_id == match_id);

          if (existingMatch) {
            if (
              existingMatch.series_id !== series_id ||
              existingMatch.team1 !== team1 ||
              existingMatch.team2 !== team2 ||
              existingMatch.start_time !== start_time ||
              existingMatch.result !== result ||
              existingMatch.match_description !== match_description
            ) {
              await db.query(
                `UPDATE matches 
                 SET series_id = $1, team1 = $2, team2 = $3, start_time = $4, result = $5, match_description = $6
                 WHERE match_id = $7`,
                [series_id, team1, team2, start_time, result, match_description, match_id]
              );
              matchesUpdated++;
            }
          } else {
            await db.query(
              `INSERT INTO matches (series_id, match_id, team1, team2, start_time, result, match_description)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [series_id, match_id, team1, team2, start_time, result, match_description]
            );
            matchesInserted++;
          }
        }
      }
    }
  }

  console.log(`✅ Matches: ${matchesInserted} inserted, ${matchesUpdated} updated`);

  // 3. Fetch and update squads
  console.log('👥 Fetching squads...');
  try {
    const squadsUrl = `https://cricbuzz-cricket.p.rapidapi.com/series/v1/${tournamentId}/squads`;
    console.log('  Step 1: Preparing to fetch from API');
    console.log('  URL:', squadsUrl);
    const squadsData = await fetchFromApi(squadsUrl);
    console.log('  Step 2: API fetch complete');
    console.log('  API Response keys:', Object.keys(squadsData || {}));
    
    if (squadsData && squadsData.squads && Array.isArray(squadsData.squads)) {
      console.log(`  Step 3: Found ${squadsData.squads.length} squads`);
      let squadsInserted = 0;
      let playersInserted = 0;

      // Delete existing squads and players for this series
      console.log('  Step 4: Deleting existing squad_players...');
      await db.query('DELETE FROM squad_players WHERE squad_id IN (SELECT squad_id FROM squads WHERE series_id = $1)', [tournamentId]);
      console.log('  Step 5: Deleting existing squads...');
      await db.query('DELETE FROM squads WHERE series_id = $1', [tournamentId]);
      console.log('  Step 6: Starting to insert squads...');

      for (const squad of squadsData.squads) {
        // Skip header entries
        if (squad.isHeader) {
          console.log(`    Skipping header: ${squad.squadType}`);
          continue;
        }
        
        const squadName = squad.squadType || 'Unknown Team'; // squadType contains team name
        const teamId = squad.teamId || null;
        const apiSquadId = squad.squadId; // API's squad ID
        
        console.log(`    Processing squad: ${squadName} (teamId: ${teamId}, squadId: ${apiSquadId})`);
        
        // Insert squad
        const squadResult = await db.query(
          `INSERT INTO squads (squad_type, team_id, series_id)
           VALUES ($1, $2, $3)
           RETURNING squad_id`,
          [squadName, teamId, tournamentId]
        );
        
        const squadId = squadResult.rows[0].squad_id;
        squadsInserted++;

        // Fetch players for this specific squad
        try {
          const squadDetailsUrl = `https://cricbuzz-cricket.p.rapidapi.com/series/v1/${tournamentId}/squads/${apiSquadId}`;
          console.log(`      Fetching players from: ${squadDetailsUrl}`);
          const squadDetails = await fetchFromApi(squadDetailsUrl);
          
          if (squadDetails && squadDetails.player && Array.isArray(squadDetails.player)) {
            console.log(`      Found ${squadDetails.player.length} player entries`);
            
            for (const player of squadDetails.player) {
              // Skip header entries like "BATTERS", "BOWLERS", etc.
              if (player.isHeader) {
                continue;
              }
              
              const playerId = player.id || null;
              const playerName = player.name || 'Unknown';
              const role = player.role || null;
              const battingStyle = player.battingStyle || null;
              const bowlingStyle = player.bowlingStyle || null;

              if (playerId && playerName) {
                try {
                  await db.query(
                    `INSERT INTO squad_players (player_id, squad_id, name, role, batting_style, bowling_style)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [playerId, squadId, playerName, role, battingStyle, bowlingStyle]
                  );
                  playersInserted++;
                } catch (playerError) {
                  console.error(`        ⚠️  Error inserting player ${playerName}:`, playerError.message);
                }
              }
            }
          } else {
            console.log(`      No players found in squad details`);
          }
        } catch (squadDetailError) {
          console.error(`      ⚠️  Error fetching squad details:`, squadDetailError.message);
        }
      }

      console.log(`✅ Squads: ${squadsInserted} teams, ${playersInserted} players inserted`);
    } else {
      console.log('⚠️  No squad data available from API');
    }
  } catch (squadError) {
    console.error('❌ Error fetching squads:', squadError.message);
    console.error('   Stack:', squadError.stack);
    // Don't throw error, continue with matches update
  }

  console.log('✅ Tournament refresh completed!\n');
}