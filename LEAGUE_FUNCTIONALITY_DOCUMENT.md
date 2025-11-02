# Fantasy Cricket League - Current Functionality Document

## 📋 Table of Contents
1. [Database Structure](#database-structure)
2. [League Creation Flow](#league-creation-flow)
3. [League Viewing & Management](#league-viewing--management)
4. [Team & Squad Management](#team--squad-management)
5. [Playing XI Feature](#playing-xi-feature)
6. [Match & Fantasy Points](#match--fantasy-points)
7. [Current Limitations](#current-limitations)
8. [Technical Stack](#technical-stack)

---

## 🗄️ Database Structure

### **fantasy_leagues** Table
| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key, auto-increment |
| league_name | varchar | Name of the league |
| team_count | integer | Maximum number of teams allowed |
| created_at | timestamp | League creation timestamp |
| privacy | varchar | 'public' or 'private' |
| description | text | League description/rules |
| tournament_id | integer | Foreign key to tournaments table |
| league_code | varchar | 8-character code for private leagues |
| created_by | varchar | Email of league creator |
| squad_size | integer | Number of players per team (15-20) |

**Constraints:**
- `squad_size` has CHECK constraint: 15 ≤ squad_size ≤ 20
- `team_count` range: 2-20 teams

### **fantasy_teams** Table
| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key, auto-increment |
| league_id | integer | Foreign key to fantasy_leagues |
| team_name | varchar | Name of the team (e.g., "John's Team") |
| team_owner | varchar | Email of team owner |
| created_at | timestamp | Team creation timestamp |

**Relationships:**
- One league can have multiple teams (up to `team_count`)
- Each team belongs to one league

### **fantasy_squads** Table
| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key, auto-increment |
| league_id | integer | Foreign key to fantasy_leagues |
| team_id | integer | Foreign key to fantasy_teams |
| player_name | text | Name of the player |
| is_captain | boolean | Captain flag |
| is_vice_captain | boolean | Vice-captain flag |
| player_id | varchar | Player identifier |
| squad_name | varchar | Cricket team name |
| created_at | timestamp | Squad entry creation timestamp |

**Constraints:**
- Each team must have exactly `squad_size` players
- Only one captain per team
- Only one vice-captain per team
- Players cannot be selected by multiple teams in same league

---

## 🏆 League Creation Flow

### **Frontend: CreateFantasy.jsx**
Location: `client/src/pages/fantasy/CreateFantasy.jsx`

#### Form Fields:
1. **League Name** (required)
   - Text input
   - No specific validation mentioned

2. **Description** (optional)
   - Textarea
   - For rules, scoring system, special notes

3. **Number of Teams** (required)
   - Number input
   - Range: 2-20 teams
   - Defines maximum participants

4. **Squad Size** (required)
   - Number input
   - Range: 15-20 players
   - Default: 15
   - Each team must select this many players

5. **Privacy** (required)
   - Dropdown: 'public' or 'private'
   - **Public**: Visible to all users, anyone can join
   - **Private**: Join with invite code only

6. **Tournament** (required)
   - Dropdown populated from tournaments table
   - Shows: Tournament Name (Type • Year)

#### Workflow:
```
User fills form
    ↓
Submit → Backend API (POST /api/fantasy)
    ↓
League created in fantasy_leagues table
    ↓
If private: Generate 8-character code
    ↓
Creator automatically added as first team member
    ↓
Success page shows:
    - League code (for private leagues)
    - Share instructions
    - Link to join: /join-league?code={CODE}
```

#### Backend API: `POST /api/fantasy`
Location: `src/controllers/api/fantasyApiController.js`

**Request Body:**
```json
{
  "leagueName": "IPL 2025 League",
  "teamCount": 10,
  "squadSize": 16,
  "privacy": "private",
  "description": "League rules...",
  "tournamentId": 9237,
  "userEmail": "user@example.com",
  "userName": "John Doe"
}
```

**Response (Private League):**
```json
{
  "success": true,
  "message": "League created successfully",
  "leagueCode": "ABC12XYZ",
  "leagueId": 123
}
```

**League Code Generation:**
- 8 characters: uppercase letters + numbers
- Format: `[A-Z0-9]{8}`
- Unique constraint enforced

---

## 👥 League Viewing & Management

### **Home Page: My Leagues**
Location: `client/src/pages/Home.jsx`

#### Features:
1. **"View My Leagues" Button**
   - Shows leagues where user is a team member
   - Filters by `team_owner` email

2. **Leagues Table Columns:**
   - League Name
   - Team Count (current/max)
   - Privacy (Public/Private badge)
   - Status (Ongoing/Completed/Unknown)
   - Created At
   - Actions (View, Delete)

3. **League Status Logic:**
   ```javascript
   if (!tournament_end_date) return 'unknown';
   if (currentTime < tournament_end_date) return 'ongoing';
   return 'completed';
   ```

4. **Delete League:**
   - Only league creator can delete
   - Only completed leagues can be deleted
   - Confirmation modal with warning
   - Permanent deletion (cannot be undone)

### **Join League Options:**

#### **Option 1: Join Public League**
- Browse public leagues on home page
- Click "Join" button
- Automatically added to league

#### **Option 2: Join by Code (Private League)**
Location: `client/src/pages/JoinLeague.jsx`

**Steps:**
1. User enters 8-character code
2. System validates code
3. If valid, shows league details
4. User confirms and joins
5. Team auto-created with name "{UserName}'s Team"

**Validation:**
- Code must exist in database
- League must not be full
- User must not already be a member

---

## 📊 League Viewing (ViewLeague.jsx)

### **Tab Structure:**

#### **1. Details Tab** (Default)
**Sections:**
- **Info Cards:**
  - 👥 Total Teams (current/max)
  - 📋 Squad Size per team
  - 🎯 Tournament name & type
  - 📅 Created date

- **League Code Section** (Private leagues only)
  - Display code in large font
  - Copy to clipboard button
  - Share instructions

- **Description Section**
  - League description/rules

- **Teams Section**
  - Grid view of all teams
  - Team number, name, owner email

#### **2. Tournament Tab**
**Features:**
- Tournament information display
- Squad selection dropdown
- Player list grouped by cricket team
- Player cards showing:
  - Player name
  - Role (WK, Batsman, All-rounder, Bowler)
  - Cricket team

#### **3. Matches Tab**
**Features:**
- Tournament fixtures table
- Columns: Match ID, Teams, Description, Result
- Clickable rows to view match details
- **Match Details Panel** (expands below clicked row):
  - Shows players from league who played
  - Fantasy points earned per player
  - Teams that selected each player
  - Smart detection: Shows message if no league players participated

#### **4. Player Stats Tab**
**Features:**
- Coming soon placeholder
- Future: Player performance statistics

#### **5. My Team Tab**
**Requirements:**
- User must be league member
- Build squad from available players

**Features:**
- **Team Statistics Cards:**
  - X/squadSize players selected
  - Captain & Vice-Captain selection
  - Role distribution display

- **Role Requirements Info:**
  - ⚠️ Minimum 1 Wicketkeeper (WK)
  - ⚠️ Minimum 20 overs bowling quota
    - Each Bowler = 4 overs
    - Each Bowling Allrounder = 4 overs
    - Each Batting Allrounder = 2 overs
    - Example: 4 Bowlers + 1 Bowling AR = 20 overs ✓

- **Selected Players Grid:**
  - Player cards with name, team, role
  - Captain/Vice-Captain badges
  - Remove button for each player
  - C/VC assignment buttons

- **Save Team Button:**
  - Validates all requirements
  - Saves to `fantasy_squads` table
  - Marks players as unavailable for other teams

**Validation Rules:**
```javascript
// Must have exactly squadSize players
if (selectedPlayers.length !== squadSize) {
  alert(`Please select exactly ${squadSize} players`);
  return false;
}

// Must have at least 1 wicketkeeper
if (wicketkeepers < 1) {
  alert('Minimum 1 Wicketkeeper required');
  return false;
}

// Must have at least 20 overs bowling quota
if (totalOvers < 20) {
  alert('Minimum 20 overs required');
  return false;
}

// Must select captain & vice-captain
if (!captain || !viceCaptain) {
  alert('Select captain and vice-captain');
  return false;
}
```

#### **6. Playing XI Tab** 🆕
**Requirements:**
- User must be league member
- User must have built squad (15-20 players)

**Features:**

**a) Header Statistics:**
- Players Selected: X/11
- Wicketkeepers count
- Total Overs count

**b) Cricket Ground Formation:**
- Visual cricket field background (green grass gradient)
- Brown pitch circle in center
- 4 Position Lines (top to bottom):
  1. **Wicketkeeper Line** (Top)
  2. **Batsmen Line**
  3. **Batting All-Rounders Line**
  4. **Bowlers & Bowling All-Rounders Line** (Bottom)

**c) Player Cards on Field:**
- Jersey icon (👕) representation
- Player name below jersey
- Captain/Vice-Captain badges (gold/purple circles)
- Action buttons:
  - `C` - Assign Captain
  - `VC` - Assign Vice-Captain
  - `✕` - Remove from Playing XI

**d) Squad Selection Panel:**
- Grid of all squad players (15-20 players)
- Click to add/remove from Playing XI
- Visual indication (gradient + checkmark) for selected
- Shows player name, role, cricket team

**e) Validation:**
```javascript
// Exactly 11 players required
if (playingXI.length !== 11) return false;

// Minimum 1 wicketkeeper
if (wicketkeepers < 1) return false;

// Minimum 20 overs quota
if (totalOvers < 20) return false;

// Captain and vice-captain required
if (!playingXICaptain || !playingXIViceCaptain) return false;
```

**f) Save Functionality:**
- Saves to backend via API
- Stores Playing XI configuration
- Can be edited later

#### **7. Available Players Tab**
**Features:**
- Browse all tournament players
- Grouped by cricket team
- Player cards showing:
  - Name, role, team
  - Selection status (✓ if selected)
  - Unavailable badge if taken by another team
- Click to add/remove from squad
- **Important Note:** Players only temporarily selected until "Save Team" is clicked

---

## ⚽ Team & Squad Management

### **Player Selection Flow:**

```
1. User clicks "Available Players" tab
   ↓
2. Browse players grouped by cricket team
   ↓
3. Click player card to select (visual indication: blue gradient + checkmark)
   ↓
4. Selected players appear in "My Team" tab
   ↓
5. Assign Captain & Vice-Captain
   ↓
6. Click "Save Team" button
   ↓
7. Validation checks run
   ↓
8. If valid: Save to fantasy_squads table
   ↓
9. Players marked as unavailable for other teams
```

### **Player Availability Logic:**

**Backend: `getUnavailablePlayers` API**
```javascript
// Fetch all players already selected in this league by other teams
SELECT DISTINCT player_id 
FROM fantasy_squads 
WHERE league_id = ? 
  AND team_id != ?  // Exclude current user's team

// These players shown with "Used by another team" badge
```

### **Captain & Vice-Captain Selection:**
- Only one of each per team
- Must be from selected squad
- Can be changed before saving
- Stored as boolean flags in `fantasy_squads` table
- Same logic applies to Playing XI (separate captain/VC)

---

## 🏏 Playing XI Feature

### **Purpose:**
Select starting lineup (11 players) from full squad (15-20 players) for match participation.

### **Visual Design:**
- **Cricket Ground Background:**
  - Green grass gradient (#2d5016 → #3d6b1f → #4d7c2a)
  - Dark green border (#1a3310)
  - Brown pitch circle in center (#8B7355)
  - Inset shadow for depth

- **Position Labels:**
  - White background with rounded corners
  - Bold uppercase text
  - 2px border
  - Box shadow

- **Player Cards:**
  - White background
  - Jersey emoji (👕)
  - Player name
  - C/VC badges (circular, positioned top-right)
  - Action buttons at bottom
  - Hover effect: elevate & scale

### **Responsive Design:**
- Desktop: Full field view, larger cards
- Tablet (≤768px): Smaller cards, adjusted spacing
- Mobile (≤480px): Compact cards, smaller text

### **Data Flow:**
```javascript
// State management
const [playingXI, setPlayingXI] = useState([]);  // 11 players
const [playingXICaptain, setPlayingXICaptain] = useState(null);
const [playingXIViceCaptain, setPlayingXIViceCaptain] = useState(null);

// Position grouping function
const getPlayersByPosition = () => {
  return {
    wicketkeeper: [],
    batsman: [],
    battingAllrounder: [],
    bowlingAllrounder: [],
    bowler: []
  };
};

// Role detection
if (role.includes('wicket') || role.includes('wk')) → wicketkeeper
if (role.includes('bowling') && role.includes('allrounder')) → bowlingAllrounder (4 overs)
if (role.includes('batting') && role.includes('allrounder')) → battingAllrounder (2 overs)
if (role.includes('bowl')) → bowler (4 overs)
if (role.includes('bat')) → batsman (0 overs)
```

---

## 📈 Match & Fantasy Points

### **Fantasy Points Calculation Formula:**

**Batting Points:**
```javascript
runs_scored +
(50-99 runs: +50 bonus) +
(100+ runs: +100 bonus) +
(fours × 1) +
(sixes × 2) +
(strike_rate ≥ 1.5: +20 bonus)
```

**Bowling Points:**
```javascript
(wickets × 25) +
(3-4 wickets: +50 bonus) +
(5+ wickets: +100 bonus) +
(economy < 4: +30 bonus)
```

**Fielding Points:**
```javascript
(catches × 10) +
(stumpings × 10) +
(runouts × 10)
```

### **Match Fantasy Points API:**
**Endpoint:** `GET /api/league/:leagueId/match/:matchId/fantasy-points`

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "match_id": "114960",
    "league_id": "67",
    "players": [
      {
        "player_id": "13866",
        "player_name": "Virat Kohli",
        "cricket_team": "Royal Challengers Bangalore",
        "fantasy_points": 85,
        "teams": [
          {
            "team_id": 45,
            "team_name": "John's Team",
            "team_owner": "john@example.com"
          }
        ]
      }
    ]
  }
}
```

### **Data Sources:**
- `player_batting_stats` table
- `player_bowling_stats` table
- `player_fielding_stats` table

**Type Casting Requirements:**
```sql
-- player_id in fantasy_squads is varchar
-- player_id in stats tables is integer
-- Requires casting: player_id::text for comparison
```

### **UI Features:**
1. **Match Table:**
   - Sortable by match number/playoff priority
   - Clickable rows
   - Selected state highlighting

2. **Match Details Panel:**
   - Appears directly below selected match row
   - Shows only players from league squads
   - Fantasy points earned per player
   - Teams that selected each player
   - Smart detection: "None of your players played this match" message

3. **Edge Cases Handled:**
   - No data returned: Shows "None of your players played"
   - Players returned but all 0 points: Shows count + explanation
   - Players with actual points: Shows table

---

## ⚠️ Current Limitations

### **1. League Structure:**
- **No League Phases:** No distinction between squad building, active, completed phases
- **No Start Date:** Leagues don't have defined start times
- **No Match Tracking:** Can't track which specific matches count for league scoring
- **No Deadlines:** No player selection deadlines before matches

### **2. Squad Management:**
- **No Edit History:** Can't track when squads were changed
- **No Transfer System:** Once selected, players are locked
- **No Substitutions:** Can't replace injured/unavailable players
- **Playing XI Storage:** Playing XI data save functionality exists but no persistence layer defined

### **3. Scoring & Leaderboard:**
- **No Total Points:** Individual match points calculated but no aggregation
- **No Team Rankings:** Can't see team standings in league
- **No Match-wise Breakdown:** Can't see points earned per match per team
- **No Auto-calculation:** Fantasy points shown per match but not summed automatically

### **4. User Experience:**
- **No Notifications:** No alerts for league events, deadlines, match starts
- **No Activity Log:** Can't see league activity history
- **No Validation Messages:** Some validations but inconsistent error messages
- **No Draft System:** First-come-first-served player selection only

### **5. Tournament Integration:**
- **Loose Coupling:** League connected to tournament_id but no enforcement
- **Match Selection:** All matches shown, can't filter relevant matches for league
- **Tournament Data:** Depends on manual tournament data refresh

### **6. Data Integrity:**
- **No Cascade Deletes:** Deleting league doesn't clean up teams/squads properly (needs verification)
- **No Transactions:** Multi-step operations not wrapped in transactions
- **Player ID Mismatch:** varchar in fantasy_squads vs integer in stats tables

---

## 🛠️ Technical Stack

### **Frontend:**
- **Framework:** React 18+
- **Build Tool:** Vite 6.4.0
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Styling:** CSS Modules
- **Port:** 5173

### **Backend:**
- **Runtime:** Node.js
- **Framework:** Express.js
- **Module System:** ES Modules (import/export)
- **Port:** 3000

### **Database:**
- **System:** PostgreSQL
- **Host:** localhost
- **Port:** 5432
- **Database:** Fantasy
- **User:** postgres

### **API Architecture:**
```
Backend Structure:
├── app.js                          # Main server file
├── src/
│   ├── config/
│   │   └── database.js            # PostgreSQL connection pool
│   ├── controllers/
│   │   └── api/
│   │       ├── fantasyApiController.js      # League creation
│   │       ├── leagueApiController.js       # League operations
│   │       ├── tournamentApiController.js   # Tournament data
│   │       └── leagueMatchStatsApiController.js  # Match stats
│   └── routes/
│       └── api/
│           └── index.js           # API route definitions

Frontend Structure:
├── client/
│   └── src/
│       ├── pages/
│       │   ├── Home.jsx                    # Dashboard
│       │   ├── JoinLeague.jsx             # Join by code
│       │   ├── fantasy/
│       │   │   └── CreateFantasy.jsx      # League creation
│       │   └── league/
│       │       ├── ViewLeague.jsx         # Main league view
│       │       └── LeagueStats.jsx        # Player statistics
│       └── services/
│           └── api.js                     # API service layer
```

### **Key API Endpoints:**

**League Management:**
- `POST /api/fantasy` - Create league
- `GET /api/leagues` - Get all leagues
- `GET /api/leagues/public` - Get public leagues
- `GET /api/league/:id` - Get league details
- `POST /api/league/:id/join` - Join league
- `POST /api/league/join-by-code` - Join by code
- `DELETE /api/league/:id` - Delete league

**Squad Management:**
- `GET /api/league/:leagueId/unavailable-players` - Get taken players
- `GET /api/league/:leagueId/team/:teamId/squad` - Get team squad
- `POST /api/league/:leagueId/team/:teamId/squad` - Save team squad

**Match Stats:**
- `GET /api/league/:leagueId/match/:matchId/fantasy-points` - Get match points

**Tournament:**
- `GET /api/tournaments` - Get all tournaments
- `GET /api/tournament/:id` - Get tournament details
- `GET /api/tournament/:id/fixtures` - Get fixtures
- `GET /api/tournament/:id/squads` - Get squads
- `GET /api/tournament/:id/squad-players` - Get squad players

---

## 📝 Notes for Requirements Planning

### **Recommended Improvements:**

1. **League Lifecycle Management:**
   - Add league phases: Registration → Active → Completed
   - Add start_date and end_date to fantasy_leagues
   - Lock squads after start_date
   - Archive completed leagues

2. **Match Association:**
   - Create `league_matches` junction table
   - Link specific matches to leagues
   - Track which matches count for scoring
   - Add match selection during league creation

3. **Scoring System:**
   - Create `team_match_scores` table
   - Auto-calculate total points from match results
   - Add leaderboard API
   - Real-time updates during matches

4. **Transfer System:**
   - Add `squad_transfers` table
   - Define transfer windows
   - Limit number of transfers
   - Transfer deadline before each match

5. **Playing XI Integration:**
   - Create `team_playing_xi` table
   - Store Playing XI per match
   - Deadline for XI selection
   - Points only count for selected Playing XI

6. **Data Consistency:**
   - Convert all player_id to consistent type
   - Add foreign key constraints
   - Implement cascade rules
   - Use transactions for multi-step operations

---

**Document Version:** 1.0
**Last Updated:** October 20, 2025
**Status:** Current Implementation Analysis
