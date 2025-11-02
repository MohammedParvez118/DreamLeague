// Squad Replacement Routes
// API routes for player replacement system

import express from 'express';
import {
  requestReplacement,
  getTeamReplacements,
  cancelReplacement,
  getPendingReplacements,
  reviewReplacement,
  getSquadWithInjuryStatus
} from '../../controllers/api/replacementController.js';

const router = express.Router();

/**
 * User Routes - Team member actions
 */

// Request a player replacement
router.post('/league/:leagueId/team/:teamId/replacements/request', requestReplacement);

// Get replacement history for team
router.get('/league/:leagueId/team/:teamId/replacements', getTeamReplacements);

// Cancel a pending replacement request
router.delete('/league/:leagueId/team/:teamId/replacements/:replacementId', cancelReplacement);

// Get squad with injury status
router.get('/league/:leagueId/team/:teamId/squad-with-status', getSquadWithInjuryStatus);

/**
 * Admin Routes - League creator actions
 */

// Get all pending replacements (league-wide)
router.get('/league/:leagueId/admin/replacements/pending', getPendingReplacements);

// Approve or reject a replacement request
router.post('/league/:leagueId/admin/replacements/:replacementId/review', reviewReplacement);

export default router;
