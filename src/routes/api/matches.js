import express from 'express';
import { getMatchScorecard, getPlayerCombinedStats } from '../controllers/api/matchApiController.js';

const router = express.Router();

// Get match scorecard
// GET /api/matches/:matchId/scorecard?rapidApiMatchId=40381
router.get('/:matchId/scorecard', getMatchScorecard);

// Get combined player stats (batting + bowling) for a match
// GET /api/matches/:matchId/player-stats
router.get('/:matchId/player-stats', getPlayerCombinedStats);

export default router;
