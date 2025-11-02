// tests/fixtures/sampleData.js
// Sample test data for Playing XI tests

export const samplePlayers = [
  { id: 'P1', name: 'Player 1', role: 'Batsman' },
  { id: 'P2', name: 'Player 2', role: 'Batsman' },
  { id: 'P3', name: 'Player 3', role: 'Batsman' },
  { id: 'P4', name: 'Player 4', role: 'Bowler' },
  { id: 'P5', name: 'Player 5', role: 'Bowler' },
  { id: 'P6', name: 'Player 6', role: 'All-rounder' },
  { id: 'P7', name: 'Player 7', role: 'All-rounder' },
  { id: 'P8', name: 'Player 8', role: 'Wicketkeeper' },
  { id: 'P9', name: 'Player 9', role: 'Batsman' },
  { id: 'P10', name: 'Player 10', role: 'Bowler' },
  { id: 'P11', name: 'Player 11', role: 'Bowler' },
  { id: 'P12', name: 'Player 12', role: 'Batsman' },
  { id: 'P13', name: 'Player 13', role: 'Batsman' },
  { id: 'P14', name: 'Player 14', role: 'All-rounder' },
  { id: 'P15', name: 'Player 15', role: 'Bowler' },
];

export const sampleMatches = [
  {
    id: 842,
    match_start: new Date('2025-10-20T10:00:00Z'), // Started (locked)
    is_completed: false,
  },
  {
    id: 844,
    match_start: new Date('2025-10-22T10:00:00Z'), // Started (locked)
    is_completed: false,
  },
  {
    id: 846,
    match_start: new Date('2025-10-28T10:00:00Z'), // Not started
    is_completed: false,
  },
  {
    id: 848,
    match_start: new Date('2025-10-30T10:00:00Z'), // Not started
    is_completed: false,
  },
];

export const sampleTeams = [
  { id: 1, team_name: 'Test Team 1', league_id: 100 },
  { id: 2, team_name: 'Test Team 2', league_id: 100 },
  { id: 3, team_name: 'Test Team 3', league_id: 100 },
];

export const baselineSquad = [
  { player_id: 'P1', is_captain: true, is_vice_captain: false },
  { player_id: 'P2', is_captain: false, is_vice_captain: true },
  { player_id: 'P3', is_captain: false, is_vice_captain: false },
  { player_id: 'P4', is_captain: false, is_vice_captain: false },
  { player_id: 'P5', is_captain: false, is_vice_captain: false },
  { player_id: 'P6', is_captain: false, is_vice_captain: false },
  { player_id: 'P7', is_captain: false, is_vice_captain: false },
  { player_id: 'P8', is_captain: false, is_vice_captain: false },
  { player_id: 'P9', is_captain: false, is_vice_captain: false },
  { player_id: 'P10', is_captain: false, is_vice_captain: false },
  { player_id: 'P11', is_captain: false, is_vice_captain: false },
];

export const changedSquad = [
  { player_id: 'P12', is_captain: true, is_vice_captain: false },  // Changed captain
  { player_id: 'P13', is_captain: false, is_vice_captain: true },  // Changed VC
  { player_id: 'P14', is_captain: false, is_vice_captain: false }, // Replaced P3
  { player_id: 'P4', is_captain: false, is_vice_captain: false },
  { player_id: 'P5', is_captain: false, is_vice_captain: false },
  { player_id: 'P6', is_captain: false, is_vice_captain: false },
  { player_id: 'P7', is_captain: false, is_vice_captain: false },
  { player_id: 'P8', is_captain: false, is_vice_captain: false },
  { player_id: 'P9', is_captain: false, is_vice_captain: false },
  { player_id: 'P10', is_captain: false, is_vice_captain: false },
  { player_id: 'P11', is_captain: false, is_vice_captain: false },
];
