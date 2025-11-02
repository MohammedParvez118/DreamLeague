//import packages for module type
import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
//import the db connection
import { db } from './src/config/database.js';
// Import auto-save service
import { startAutoSaveService } from './src/services/autoSaveService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve React build files (for production)
app.use(express.static(path.join(__dirname, 'client/dist')));

// Routes
import apiRouter from './src/routes/api/index.js';

// API Routes (for React frontend)
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'API Server Running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint - API documentation
app.get('/', (req, res) => {
  res.json({ 
    message: 'Fantasy App API Server', 
    version: '2.0.0',
    mode: process.env.NODE_ENV || 'development',
    note: 'React frontend runs on http://localhost:5173 in development',
    apiEndpoints: {
      health: 'GET /health',
      leagues: 'GET /api/leagues',
      tournaments: 'GET /api/tournaments',
      createLeague: 'POST /api/fantasy',
      leagueDetails: 'GET /api/fantasy/:leagueId',
      setupTeams: 'POST /api/fantasy/setup-teams/:leagueId',
      submitSquads: 'POST /api/fantasy/setup-teams/submit-squads/:leagueId',
      viewLeague: 'GET /api/league/:id'
    }
  });
});



app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  
  // Start auto-save service (runs every 5 minutes)
  startAutoSaveService(5);
});
