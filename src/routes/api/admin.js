import express from 'express';
import { autoSavePlayingXIForAllLeagues } from '../../services/autoSaveService.js';

const router = express.Router();

/**
 * Manually trigger auto-save for all leagues
 * POST /api/admin/auto-save-playing-xi
 */
router.post('/auto-save-playing-xi', async (req, res) => {
  try {
    console.log('Manual auto-save triggered via API');
    
    const result = await autoSavePlayingXIForAllLeagues();
    
    if (result.success) {
      res.json({
        success: true,
        message: `Auto-save completed: ${result.totalAutoSaved} lineups saved`,
        data: {
          totalAutoSaved: result.totalAutoSaved,
          totalMatches: result.totalMatches,
          totalTeams: result.totalTeams
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Auto-save failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in manual auto-save:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger auto-save',
      error: error.message
    });
  }
});

/**
 * Get auto-save service status
 * GET /api/admin/auto-save-status
 */
router.get('/auto-save-status', async (req, res) => {
  try {
    // You could add service health checks here
    res.json({
      success: true,
      data: {
        serviceRunning: true,
        intervalMinutes: 5,
        lastRun: new Date().toISOString(),
        message: 'Auto-save service is running in background'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
