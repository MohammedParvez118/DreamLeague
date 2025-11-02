# Fantasy Points Calculation System

## Overview
This document explains how fantasy points are calculated for players based on their match performance statistics stored in the scorecard tables.

## Implementation Status

### ✅ **Implemented (Can Calculate)**

#### Batting Points
- **Base runs**: +1 per run ✅
- **Boundary bonus**: +1 for each 4 (in addition to runs) ✅
- **Six bonus**: +2 for each 6 (in addition to runs) ✅
- **Milestone bonuses**: ✅
  - 25 runs: +4
  - 50 runs: +8
  - 75 runs: +12
  - 100 runs: +16
  - (Only highest milestone applied)
- **Duck penalty**: -2 points ✅
- **Strike Rate bonus** (min 10 balls): ✅
  - Above 170: +6
  - 150-170: +4
  - 130-150: +2
  - 60-70: -2
  - 50-60: -4
  - Below 50: -6

#### Bowling Points
- **Wickets**: +30 per wicket ✅
- **Wicket milestones** (per innings): ✅
  - 3 wickets: +4
  - 4 wickets: +8
  - 5 wickets: +12
- **Maiden overs**: +12 per maiden ✅
- **Dot balls**: +1 per dot ball ✅
- **Economy Rate bonus** (min 2 overs): ✅
  - Below 5.00: +6
  - 5.00-5.99: +4
  - 6.00-7.00: +2
  - 10.00-11.00: -2
  - 11.01-12.00: -4
  - Above 12.00: -6

### ❌ **Not Implemented (Data Not Available)**

#### Bowling Details
- **LBW/Bowled bonus**: +8 (would need to parse dismissal_info text)
  - Current: `dismissal_info` is stored as text like "c Fielder b Bowler"
  - Would need: Parse text to identify "b Bowler" or "lbw b Bowler"

#### Fielding Points
- **Catches**: +8 per catch ❌
- **3-Catch bonus**: +4 ❌
- **Stumpings**: +12 per stumping ❌
- **Run-out (direct)**: +12 ❌
- **Run-out (indirect)**: +6 ❌
- **Note**: Fielding stats are not included in RapidAPI scorecard response

#### Other
- **Playing XI bonus**: +4 ❌ (would need team sheet data)
- **Captain multiplier**: ×2 ❌ (fantasy league specific)
- **Vice-Captain multiplier**: ×1.5 ❌ (fantasy league specific)
- **Substitute bonus**: +4 ❌ (not in scorecard data)
- **Overthrow runs**: Complex logic not implemented

## Database Tables Used

### `player_batting_stats`
```sql
- player_id
- player_name
- runs (base points)
- balls_faced (for strike rate)
- fours (boundary bonus)
- sixes (six bonus)
- strike_rate (SR bonus calculation)
- dismissal_info (duck detection: runs=0 AND dismissal_info != 'not out')
```

### `player_bowling_stats`
```sql
- player_id
- player_name
- wickets (wicket points)
- overs (for economy rate eligibility)
- maidens (maiden bonus)
- dots (dot ball bonus)
- economy (economy rate bonus)
- runs_conceded (used in economy calculation)
```

## API Endpoint

### GET `/api/tournaments/:tournamentId/stats`

Returns aggregated player statistics across all matches in a tournament:

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "player_id": 123,
      "player_name": "Player Name",
      "batting_innings": 5,
      "total_runs": 250,
      "total_balls": 180,
      "total_fours": 20,
      "total_sixes": 10,
      "highest_score": 75,
      "avg_strike_rate": 138.89,
      "ducks": 1,
      "bowling_innings": 5,
      "total_wickets": 8,
      "total_overs": 18.5,
      "total_runs_conceded": 145,
      "total_maidens": 2,
      "total_dots": 45,
      "max_wickets_in_innings": 3,
      "avg_economy": 7.69,
      "matches_played": 5
    }
  ]
}
```

## Frontend Components

### `/tournament/tournament-stats/:tournamentId`

**Features:**
- **4 tabs**:
  1. **Fantasy Points**: Shows calculated fantasy points for all players
  2. **Batting**: Batting-specific statistics
  3. **Bowling**: Bowling-specific statistics
  4. **All Stats**: Combined view with both batting and bowling
  
- **Sorting**: Click column headers to sort
- **Top 3 performers**: Highlighted with medals (🥇🥈🥉)
- **Responsive design**: Mobile-friendly tables

## Fantasy Points Calculation Logic

The frontend calculates fantasy points in real-time using the `calculateFantasyPoints()` function:

```javascript
// Batting points
points += total_runs * 1;
points += total_fours * 1;  // Bonus in addition to runs
points += total_sixes * 2;   // Bonus in addition to runs
points += milestone_bonus;    // 4/8/12/16 based on highest reached
points += strike_rate_bonus;  // -6 to +6 based on SR
points -= ducks * 2;          // Penalty for getting out on 0

// Bowling points
points += total_wickets * 30;
points += wicket_milestone_bonus;  // 4/8/12 for 3/4/5 wickets
points += total_maidens * 12;
points += total_dots * 1;
points += economy_bonus;  // -6 to +6 based on economy
```

## Future Enhancements

To implement missing features:

1. **LBW/Bowled Bonus**:
   - Parse `dismissal_info` text with regex
   - Look for patterns: `"lbw"` or `"b Bowler"` (not `"c ... b Bowler"`)

2. **Fielding Stats**:
   - Would require different API endpoint
   - RapidAPI doesn't provide fielding stats in scorecard
   - Alternative: Manual entry or different data source

3. **Fantasy League Integration**:
   - Track captain/vice-captain selections per user
   - Apply multipliers when displaying user's team points
   - Store in `fantasy_team_selections` table

4. **Playing XI Bonus**:
   - Fetch team sheet data before match
   - Award points to selected players
   - Store in new table: `match_playing_xi`

## Usage Example

Navigate to any tournament, click "Stats", and view:
- Player rankings by fantasy points
- Detailed batting/bowling statistics
- Sortable tables by any metric
- Top performers highlighted

The stats automatically aggregate data from all matches in the tournament that have scorecard data available.

## Notes

- Fantasy points are calculated **client-side** (not stored in database)
- Calculation happens on every render - very fast with aggregated data
- Only players with scorecard data are shown
- Stats update when new match scorecards are fetched
- Minimum eligibility criteria (10 balls for SR, 2 overs for economy) are enforced
