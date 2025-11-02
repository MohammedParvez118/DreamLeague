// src/routes/api/index.js
import express from 'express';
import { getHomeData, getLeagues, getTournaments } from '../../controllers/api/homeApiController.js';
import { createFantasyLeague, getLeague } from '../../controllers/api/fantasyApiController.js';
import { 
  getLeagueDetails, 
  joinLeague, 
  getPublicLeagues, 
  joinLeagueByCode, 
  deleteLeague,
  getLeagueMatches,
  getLeaderboard,
  getTopPerformers,
  getTeamMatchBreakdown,
  getLeagueInfo
} from '../../controllers/api/leagueApiController.js';
import { 
  getSeries, 
  addTournament, 
  refreshTournament, 
  getTournamentHome, 
  getTournamentFixtures, 
  getTournamentSquads, 
  getSquadPlayers,
  deleteTournament
} from '../../controllers/api/tournamentApiController.js';
import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  logout
} from '../../controllers/api/authApiController.js';
import { getMatchScorecard, getPlayerCombinedStats } from '../../controllers/api/matchApiController.js';
import { getTournamentStats } from '../../controllers/api/tournamentStatsApiController.js';
import { getPlayerMatchStats } from '../../controllers/api/playerMatchStatsApiController.js';
import {
  getUnavailablePlayers,
  getTeamSquad,
  saveTeamSquad,
  addPlayerToSquad,
  removePlayerFromSquad
} from '../../controllers/api/fantasySquadApiController.js';
import { getMatchFantasyPoints } from '../../controllers/api/leagueMatchStatsApiController.js';

// Import new route modules
import playingXIRoutes from './playingXI.js';
import transferRoutes from './transfer.js';
import matchStatsRoutes from './matchStats.js';
import replacementRoutes from './replacement.js';
import adminRoutes from './admin.js';

const router = express.Router();

// Home API routes
router.get('/home', getHomeData);
router.get('/leagues', getLeagues);
router.get('/leagues/public', getPublicLeagues);  // More specific route first
router.get('/tournaments', getTournaments);

// Fantasy League API routes
router.post('/fantasy', createFantasyLeague);
router.get('/fantasy/:leagueId', getLeague);

// League API routes
router.post('/league/join-by-code', joinLeagueByCode);  // More specific route first
router.delete('/league/:leagueId', deleteLeague);
router.get('/league/:id', getLeagueDetails);
router.post('/league/:id/join', joinLeague);

// Tournament API routes
router.get('/tournament/series', getSeries);
router.post('/tournament/add', addTournament);
router.get('/tournament/refresh/:tournamentId', refreshTournament);
router.delete('/tournament/:tournamentId', deleteTournament);
router.get('/tournament/:tournamentId', getTournamentHome);
router.get('/tournament/:tournamentId/fixtures', getTournamentFixtures);
router.get('/tournament/:tournamentId/squads', getTournamentSquads);
router.get('/tournament/:tournamentId/squad-players', getSquadPlayers);

// Tournament Stats API route
router.get('/tournaments/:tournamentId/stats', getTournamentStats);

// Player Match Stats API route
router.get('/tournaments/:tournamentId/player/:playerId/matches', getPlayerMatchStats);

// Authentication API routes
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/verify-email', verifyEmail);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/logout', logout);

// Match API routes
router.get('/matches/:matchId/scorecard', getMatchScorecard);
router.get('/matches/:matchId/player-stats', getPlayerCombinedStats);

// Fantasy Squad API routes
router.get('/league/:leagueId/unavailable-players', getUnavailablePlayers);
router.get('/league/:leagueId/team/:teamId/squad', getTeamSquad);
router.post('/league/:leagueId/team/:teamId/squad', saveTeamSquad);
router.post('/league/:leagueId/team/:teamId/squad/add-player', addPlayerToSquad);
router.delete('/league/:leagueId/team/:teamId/squad/player/:playerId', removePlayerFromSquad);

// League Match Stats API route
router.get('/league/:leagueId/match/:matchId/fantasy-points', getMatchFantasyPoints);

// ============================================================================
// NEW EXTENDED FUNCTIONALITY ROUTES
// ============================================================================

// League extended API routes
router.get('/league/:id/matches', getLeagueMatches);
router.get('/league/:id/leaderboard', getLeaderboard);
router.get('/league/:id/top-performers', getTopPerformers);
router.get('/league/:leagueId/team/:teamId/match-breakdown', getTeamMatchBreakdown);
router.get('/league/:id/info', getLeagueInfo);

// Use imported route modules
router.use('/', playingXIRoutes);
router.use('/', transferRoutes);
router.use('/', matchStatsRoutes);
router.use('/', replacementRoutes);
router.use('/admin', adminRoutes);

export default router;