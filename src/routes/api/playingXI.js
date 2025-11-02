import express from 'express';
import {
  getPlayingXI,
  savePlayingXI,
  checkMatchLock,
  getMatchesWithPlayingXIStatus,
  copyPlayingXI,
  getTransferStats
} from '../../controllers/api/playingXiControllerAdapter.js';

const router = express.Router();

/**
 * Playing XI Routes
 * 
 * Note: DELETE endpoint removed - not compatible with sequential locking system
 * where each match depends on previous match baseline
 */

// Get Playing XI for a specific match and team (with auto-save from previous)
router.get('/league/:leagueId/team/:teamId/match/:matchId/playing-xi', getPlayingXI);

// Save/Update Playing XI for a specific match
router.post('/league/:leagueId/team/:teamId/match/:matchId/playing-xi', savePlayingXI);

// Check if match is locked (deadline passed)
router.get('/league/:leagueId/match/:matchId/is-locked', checkMatchLock);

// Get all matches with Playing XI status for a team
router.get('/league/:leagueId/team/:teamId/matches-status', getMatchesWithPlayingXIStatus);

// Copy Playing XI from previous match
router.post('/league/:leagueId/team/:teamId/match/:matchId/copy-playing-xi', copyPlayingXI);

// Get transfer statistics for a team
router.get('/league/:leagueId/team/:teamId/transfer-stats', getTransferStats);

export default router;
