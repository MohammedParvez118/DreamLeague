import express from 'express';
import {
  getRemainingTransfers,
  getTransferHistory,
  transferPlayer,
  getAvailablePlayersForTransfer,
  undoLastTransfer
} from '../../controllers/api/transferController.js';

const router = express.Router();

/**
 * Transfer Routes
 */

// Get remaining transfers for a team
router.get('/league/:leagueId/team/:teamId/transfers/remaining', getRemainingTransfers);

// Get transfer history for a team
router.get('/league/:leagueId/team/:teamId/transfers/history', getTransferHistory);

// Perform a player transfer
router.post('/league/:leagueId/team/:teamId/transfer', transferPlayer);

// Get available players for transfer
router.get('/league/:leagueId/team/:teamId/transfer/available', getAvailablePlayersForTransfer);

// Undo last transfer (within 5 minutes)
router.post('/league/:leagueId/team/:teamId/transfer/undo', undoLastTransfer);

export default router;
