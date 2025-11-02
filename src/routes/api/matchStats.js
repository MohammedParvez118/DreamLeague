import express from 'express';
import {
  calculateMatchPoints,
  getTeamMatchPointsBreakdown,
  recalculateAllPoints
} from '../../controllers/api/matchStatsController.js';

const router = express.Router();

/**
 * Match Stats & Points Calculation Routes
 */

// Calculate and update fantasy points for a completed match
router.post('/league/:leagueId/match/:matchId/calculate-points', calculateMatchPoints);

// Get fantasy points breakdown for a team in a match
router.get('/league/:leagueId/team/:teamId/match/:matchId/points-breakdown', getTeamMatchPointsBreakdown);

// Recalculate all match points for a league (admin function)
router.post('/league/:leagueId/recalculate-all-points', recalculateAllPoints);

export default router;
