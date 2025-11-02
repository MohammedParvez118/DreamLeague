# 🎮 Fantasy Cricket App - Features Guide

## Table of Contents
- [Authentication](#authentication)
- [Tournament Management](#tournament-management)
- [League System](#league-system)
- [Team Management](#team-management)
- [DEV Mode](#dev-mode)

---

## Authentication

### User Registration & Login
- **Email/Password authentication** with secure bcrypt hashing
- **Email verification** required before first login
- **Session management** with httpOnly cookies
- **Password reset** functionality (email-based)

### Protected Routes
- All fantasy league operations require authentication
- Frontend ProtectedRoute component redirects unauthorized users
- Backend middleware validates session on API requests

**Files:**
- `src/controllers/api/authApiController.js` - Auth logic
- `client/src/components/ProtectedRoute.jsx` - Route protection
- `client/src/pages/Auth.jsx` - Login/Register UI

---

## Tournament Management

### Add Tournament
Users can add cricket tournaments by entering the **Series ID** from RapidAPI.

**Features:**
- Fetches tournament details from RapidAPI
- Auto-populates: name, type, year, start date, end date
- Stores matches and squads for the tournament
- Supports International, League, Domestic, and Women's cricket

**Endpoints:**
- `POST /api/tournament/add` - Add new tournament
- `GET /api/tournament/:tournamentId/home` - Tournament details
- `GET /api/tournament/:tournamentId/fixtures` - Match schedule
- `GET /api/tournament/:tournamentId/squads` - Team squads

### Delete Tournament

**Business Rules:**
- ✅ Only tournaments with **no active leagues** can be deleted
- ✅ Tournament **end date must have passed** (completed tournament)
- ✅ Cascade deletes: matches, squads, squad_players
- ❌ Cannot delete if any league references the tournament
- ❌ Cannot delete ongoing tournaments

**UI:**
- Delete button (🗑️) appears only for completed tournaments with no leagues
- Confirmation modal with tournament details
- Auto-refresh after successful deletion

**Implementation:**
```javascript
// Backend validation
if (currentTime < tournamentEndTime) {
  return res.status(400).json({ 
    error: 'Cannot delete ongoing tournament. Please wait until it completes.' 
  });
}

// Check for leagues
const leagueCheck = await db.query(
  'SELECT id FROM fantasy_leagues WHERE tournament_id = $1 LIMIT 1',
  [tournamentId]
);
if (leagueCheck.rows.length > 0) {
  return res.status(400).json({ 
    error: 'Cannot delete tournament with active leagues' 
  });
}
```

**Files:**
- `src/controllers/api/tournamentApiController.js` - Tournament CRUD
- `client/src/pages/Tournaments.jsx` - Tournament list with delete UI

---

## League System

### Create Fantasy League

**Types:**
1. **Public League** - Anyone can join with code
2. **Private League** - Invite-only

**Settings:**
- League name
- Tournament selection
- Auto-add creator as first team (optional)
- Scoring system configuration

**Endpoints:**
- `POST /api/fantasy/create` - Create new league
- `GET /api/leagues` - User's leagues
- `GET /api/leagues/public` - Browse public leagues

### Join League

Users can join existing leagues by entering a **6-digit league code**.

**Features:**
- Browse public leagues or enter code directly
- Validates:
  - League exists and is active
  - User not already in league
  - Unique team name in league
- Auto-creates fantasy team for user

**Flow:**
```
1. User enters league code → 2. Backend validates → 
3. Creates fantasy_team record → 4. Redirects to team setup
```

**Files:**
- `src/controllers/api/leagueApiController.js` - Join logic
- `client/src/pages/JoinLeague.jsx` - Join UI

### Delete League

**Business Rules:**
- ✅ Only **league creator** can delete
- ✅ Tournament must be **completed** (end date passed)
- ✅ Cascade deletes: fantasy_teams, squad_players
- ❌ Cannot delete ongoing leagues
- ❌ Non-creators see no delete button

**Status Calculation:**
```javascript
// Frontend
getLeagueStatus(league) {
  if (!league.tournament_end_date) return 'unknown';
  const currentTime = Date.now();
  const endTime = parseInt(league.tournament_end_date);
  return currentTime < endTime ? 'ongoing' : 'completed';
}

canDeleteLeague(league) {
  if (!user?.email) return false;
  if (league.created_by !== user.email) return false;
  return getLeagueStatus(league) === 'completed';
}
```

**UI:**
- Status badges: 🟢 Ongoing | ✅ Completed | ❓ Unknown
- Delete button (🗑️) only for creators of completed leagues
- Confirmation modal with league info

**Database Schema:**
```sql
-- Added columns
ALTER TABLE fantasy_leagues ADD COLUMN created_by VARCHAR(255);
ALTER TABLE tournaments ADD COLUMN start_date BIGINT;
ALTER TABLE tournaments ADD COLUMN end_date BIGINT;
```

**Files:**
- `src/controllers/api/leagueApiController.js` - Delete logic
- `client/src/pages/Home.jsx` - League list with delete UI
- `migrations/add_league_created_by.sql`
- `migrations/add_tournament_dates.sql`

### View League

Detailed league dashboard showing:
- League information (name, code, tournament)
- All teams in the league
- Team rankings by points
- Your team details
- Squad players with stats

**Features:**
- Real-time team standings
- Player performance tracking
- Team comparison

**Files:**
- `src/controllers/api/leagueApiController.js` - League details
- `client/src/pages/league/ViewLeague.jsx` - League dashboard

---

## Team Management

### Setup Fantasy Team

After joining a league, users must:
1. **Name their team**
2. **Select 11 players** from available squads
3. **Assign roles**: Batsman, Bowler, All-rounder, Wicket-keeper
4. **Stay within budget** constraints

**Validation:**
- Minimum player requirements per role
- Maximum players from same real team
- Budget cap enforcement

**Endpoints:**
- `POST /api/fantasy/setup-team` - Save team name
- `POST /api/fantasy/save-squad` - Save player selection

**Files:**
- `src/controllers/api/fantasyApiController.js`
- `client/src/pages/fantasy/SetupTeams.jsx`
- `client/src/pages/fantasy/SetupSquads.jsx`

---

## DEV Mode

### Purpose
Skip RapidAPI calls during development to:
- ✅ Avoid API rate limits
- ✅ Speed up testing
- ✅ Work offline
- ✅ Use mock data

### Activation

**Method 1: Environment Variable**
```bash
# .env
DEV_MODE=true
```

**Method 2: Frontend Toggle**
```
Settings → Enable DEV Mode ✓
```

### Behavior

**Tournament Addition:**
- **Production:** Fetches from RapidAPI
- **DEV Mode:** Returns mock tournament data
  ```javascript
  {
    seriesId: 12345,
    name: "DEV Test Series",
    startDate: Date.now(),
    endDate: Date.now() + 30 days,
    matches: [...mock matches...],
    squads: [...mock squads...]
  }
  ```

**Detection:**
```javascript
// Backend
const isDevMode = process.env.DEV_MODE === 'true';

// Frontend
const devMode = localStorage.getItem('devMode') === 'true';
```

**Visual Indicator:**
- 🧪 Badge in navigation when DEV mode active
- Console logs for mock data usage

**Files:**
- `src/services/apiService.js` - Mock data generator
- `client/src/App.jsx` - DEV mode toggle

---

## Database Schema

### Key Tables

**users**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  reset_token VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**tournaments**
```sql
CREATE TABLE tournaments (
  series_id INTEGER PRIMARY KEY,
  name VARCHAR(255),
  type VARCHAR(50),
  year INTEGER,
  start_date BIGINT,  -- Unix timestamp (ms)
  end_date BIGINT     -- Unix timestamp (ms)
);
```

**fantasy_leagues**
```sql
CREATE TABLE fantasy_leagues (
  id SERIAL PRIMARY KEY,
  league_name VARCHAR(255),
  league_code VARCHAR(6) UNIQUE,
  tournament_id INTEGER REFERENCES tournaments(series_id),
  is_public BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(255),  -- User email
  created_at TIMESTAMP DEFAULT NOW()
);
```

**fantasy_teams**
```sql
CREATE TABLE fantasy_teams (
  id SERIAL PRIMARY KEY,
  league_id INTEGER REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
  team_name VARCHAR(255),
  team_owner VARCHAR(255),  -- User email
  points INTEGER DEFAULT 0
);
```

**squad_players**
```sql
CREATE TABLE squad_players (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  player_id INTEGER,
  player_name VARCHAR(255),
  role VARCHAR(50),
  team VARCHAR(100)
);
```

---

## API Reference

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/verify-email` - Verify email
- `GET /api/auth/me` - Get current user

### Tournaments
- `POST /api/tournament/add` - Add tournament
- `DELETE /api/tournament/:id` - Delete tournament
- `GET /api/tournaments` - List all tournaments
- `GET /api/tournament/:id/home` - Tournament details
- `GET /api/tournament/:id/fixtures` - Match fixtures
- `GET /api/tournament/:id/squads` - Team squads

### Leagues
- `POST /api/fantasy/create` - Create league
- `POST /api/league/join` - Join league
- `DELETE /api/league/:id` - Delete league
- `GET /api/leagues` - User's leagues
- `GET /api/leagues/public` - Public leagues
- `GET /api/league/:code` - League by code
- `GET /api/league/:id/details` - League details

### Fantasy Teams
- `POST /api/fantasy/setup-team` - Setup team
- `POST /api/fantasy/save-squad` - Save squad
- `GET /api/fantasy/team/:id` - Team details

### Home
- `GET /api/home` - Dashboard data

---

## Environment Variables

```bash
# Database
DB_USER=postgres
DB_HOST=localhost
DB_NAME=Fantasy
DB_PASSWORD=your_password
DB_PORT=5432

# Session
SESSION_SECRET=your_secret_key_here

# Email (Optional - for verification)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# RapidAPI
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=cricbuzz-cricket.p.rapidapi.com

# Development
DEV_MODE=false  # Set to 'true' for mock data
```

---

## Troubleshooting

### Issue: "Unknown" league status
**Cause:** Tournament missing end_date  
**Fix:** Run migration `migrations/add_tournament_dates.sql`

### Issue: Delete button not showing for leagues
**Causes:**
1. Not logged in as creator
2. Tournament still ongoing
3. Missing `created_by` column  

**Fix:** Run migration `migrations/add_league_created_by.sql`

### Issue: Cannot join league
**Causes:**
1. Invalid league code
2. Already in league
3. Duplicate team name

**Check:** Browser console for specific error message

### Issue: RapidAPI rate limit
**Solution:** Enable DEV_MODE to use mock data

---

## Recent Updates

### v2.0 - React Migration (Complete)
- ✅ Migrated from EJS to React + Vite
- ✅ Modern SPA architecture
- ✅ JWT session authentication
- ✅ Protected routes with React Router

### v2.1 - Tournament Dates & Validation
- ✅ Store tournament start/end dates from RapidAPI
- ✅ Prevent deletion of ongoing tournaments
- ✅ Prevent deletion of tournaments with active leagues

### v2.2 - League Management Enhancements
- ✅ League creator tracking
- ✅ Delete league (creator-only, completed tournaments)
- ✅ League status badges (Ongoing/Completed/Unknown)
- ✅ Join league improvements

### v2.3 - Auto-add Creator Feature
- ✅ Optional auto-add league creator as first team
- ✅ Streamlined league creation flow
- ✅ Improved UX for solo testing

---

## Contributing

See `CONTRIBUTING.md` for development setup and guidelines.

## Support

For issues or questions:
1. Check this guide first
2. Review `docs/DEVELOPMENT.md` for dev setup
3. Check `docs/AUTHENTICATION_GUIDE.md` for auth issues
4. Check `docs/EMAIL_CONFIGURATION.md` for email setup
