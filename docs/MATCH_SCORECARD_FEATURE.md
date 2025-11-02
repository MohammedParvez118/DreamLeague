# Match Scorecard Feature Documentation

## Overview
The Match Scorecard feature allows users to view detailed player-wise statistics for each match in a tournament. The feature is designed with **API rate limiting** in mind, using a database-first approach with manual refresh capability.

## ⚠️ API Rate Limits
- **Daily Limit**: 100 requests per day
- **Per-Minute Limit**: 6 requests per minute
- **Strategy**: Database-first with manual refresh to conserve API calls

## Database Schema

### Tables Created
1. **match_scorecards** - Stores innings-level data
2. **player_batting_stats** - Individual batsman statistics
3. **player_bowling_stats** - Individual bowler statistics
4. **fall_of_wickets** - Wicket fall tracking
5. **partnerships** - Partnership details between batsmen
6. **match_summaries** - Overall match information

### Migration File
Location: `migrations/create_match_scorecards.sql`

## API Endpoints

### 1. Get Match Scorecard
**Endpoint**: `GET /api/matches/:matchId/scorecard`

**Query Parameters**:
- `rapidApiMatchId` (optional) - RapidAPI match ID to fetch from API

**Behavior**:
- If `rapidApiMatchId` is **NOT** provided:
  - Returns data from database if available
  - Returns 400 error if no data in database
- If `rapidApiMatchId` is provided:
  - Fetches fresh data from RapidAPI (counts toward rate limit)
  - Stores in database
  - Returns the fetched data

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "match_status": "Ireland won by 9 runs",
      "is_match_complete": true
    },
    "scorecards": [...]
  },
  "source": "database" | "rapidapi"
}
```

### 2. Get Combined Player Stats
**Endpoint**: `GET /api/matches/:matchId/player-stats`

Returns combined batting and bowling stats for fantasy points calculation.

## Frontend Implementation

### Route
```
/tournament/tournament-fixtures/:tournamentId/:matchId
```

### Key Features

#### 1. Database-First Loading
- Initial page load fetches from database only
- If no data exists, shows "Fetch Scorecard" button
- No automatic API calls

#### 2. Manual Refresh Button
- Visible in header when data exists
- Manually triggers API call to RapidAPI
- Shows loading state and API limit warning

#### 3. Data Source Badge
- Shows data origin: "Database (Cached)" or "RapidAPI (Live)"
- Helps users understand data freshness

#### 4. Detailed Statistics
- **Batting**: Runs, balls, 4s, 6s, strike rate, dismissal
- **Bowling**: Overs, maidens, runs, wickets, economy, dots
- **Fall of Wickets**: Wicket progression display
- **Partnerships**: Detailed partnership breakdown

## Rate Limit Management Strategy

### Why Database-First?
1. **Preserve API Quota**: Only 100 requests/day available
2. **Faster Loading**: Cached data loads instantly
3. **User Control**: Users decide when to spend an API call
4. **Data Persistence**: Once fetched, available indefinitely

### Best Practices
1. Fetch scorecards only when needed
2. Refresh only after match completion for final stats
3. Use cached data for repeated views
4. Monitor API usage to avoid hitting limits

## Testing the Feature

### 1. Start Application
```bash
# Backend
node app.js

# Frontend
cd client && npm run dev
```

### 2. Test Flow
1. Navigate to Tournament → Fixtures
2. Click on any match row
3. **First Time**: Click "Fetch Scorecard" button
4. **Subsequent Visits**: See cached scorecard instantly
5. Click "Refresh" button to update from API

## Files Created/Modified

### Backend
- ✅ `migrations/create_match_scorecards.sql`
- ✅ `src/controllers/api/matchApiController.js`
- ✅ `src/routes/api/index.js`

### Frontend
- ✅ `client/src/pages/Tournament/MatchScorecard.jsx`
- ✅ `client/src/pages/Tournament/MatchScorecard.css`
- ✅ `client/src/App.jsx`
- ✅ `client/src/pages/tournament/TournamentFixtures.jsx`

## Summary

✅ Database tables created (6 tables)  
✅ Backend API endpoints with rate limit handling  
✅ Frontend component with manual refresh  
✅ Clickable fixtures navigation  
✅ User-friendly UI with loading states  
✅ API conservation through caching  

**Rate limits respected**: 100 requests/day, 6 requests/minute
