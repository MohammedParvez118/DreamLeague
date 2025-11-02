# Fantasy League Upgrade - Database Migration Guide

## Overview
This migration updates the `fantasy_leagues` table to support the new league creation features:
- Privacy settings (Public/Private)
- League descriptions
- Tournament association
- Unique league codes for private leagues

## Changes Made

### Database Schema Changes
**Added Columns:**
- `privacy` (VARCHAR(10)) - Either 'public' or 'private'
- `description` (TEXT) - League description/rules
- `tournament_id` (INTEGER) - References tournament series_id
- `league_code` (VARCHAR(20)) - Unique code for private leagues

**Removed Columns:**
- `selection_mode` - No longer needed
- `point_system` - No longer needed

### Application Changes

**Frontend:**
- Updated `CreateFantasy.jsx` component with new form fields
- Added tournament dropdown selection
- Added privacy toggle (Public/Private)
- Added description textarea
- Removed setup teams and setup squads workflow
- Added success screen with league code display for private leagues

**Backend:**
- Updated `createFantasyLeague` controller to handle new fields
- Added automatic league code generation for private leagues
- Removed setup teams and squad endpoints

## Running the Migration

### Option 1: Using psql directly
```bash
psql -U postgres -d fantasy_app -f migrations/update_fantasy_leagues.sql
```

### Option 2: Using the migration script
```bash
chmod +x migrations/run_migration.sh
./migrations/run_migration.sh
```

### Option 3: Manual SQL execution
Connect to your PostgreSQL database and run the SQL commands from `migrations/update_fantasy_leagues.sql`

## Migration SQL Script

The migration performs the following steps:

1. **Add new columns** to fantasy_leagues table
2. **Drop old columns** that are no longer used
3. **Create indexes** for better query performance on:
   - league_code (for private league lookups)
   - privacy (for filtering public/private leagues)
   - tournament_id (for tournament associations)
4. **Update existing records** to set privacy to 'public' by default

## Rollback (if needed)

If you need to rollback the migration:

```sql
-- Add back old columns
ALTER TABLE fantasy_leagues 
ADD COLUMN selection_mode VARCHAR(20),
ADD COLUMN point_system VARCHAR(20);

-- Remove new columns
ALTER TABLE fantasy_leagues 
DROP COLUMN privacy,
DROP COLUMN description,
DROP COLUMN tournament_id,
DROP COLUMN league_code;

-- Drop indexes
DROP INDEX IF EXISTS idx_league_code;
DROP INDEX IF EXISTS idx_privacy;
DROP INDEX IF EXISTS idx_tournament_id;
```

## Testing the Migration

After running the migration:

1. **Verify table structure:**
   ```sql
   \d fantasy_leagues
   ```

2. **Test creating a public league:**
   - Go to `/fantasy`
   - Fill in league details
   - Select "Public" privacy
   - Choose a tournament
   - Submit the form
   - Should redirect to home after 2 seconds

3. **Test creating a private league:**
   - Go to `/fantasy`
   - Fill in league details
   - Select "Private" privacy
   - Choose a tournament
   - Submit the form
   - Should display a unique 8-character code
   - Code should be copyable

4. **Verify database entries:**
   ```sql
   SELECT id, league_name, privacy, league_code, tournament_id 
   FROM fantasy_leagues 
   ORDER BY id DESC 
   LIMIT 5;
   ```

## New Features

### Public Leagues
- Anyone can discover and join
- No league code required
- Visible in league listings

### Private Leagues
- Only accessible with invite code
- Generates unique 8-character alphanumeric code
- Code displayed after creation
- Can be shared via copy button

### Tournament Association
- Each league must be associated with a tournament
- Tournament dropdown populated from tournaments table
- Links league to specific cricket series

### League Description
- Optional text field for league rules
- Can describe scoring system, special notes, etc.
- Helps players understand league format

## Files Modified

### Backend
- `src/controllers/api/fantasyApiController.js` - Updated createFantasyLeague
- `src/routes/api/index.js` - Removed setup-teams routes
- `migrations/update_fantasy_leagues.sql` - Database migration script

### Frontend
- `client/src/pages/fantasy/CreateFantasy.jsx` - Complete rewrite
- `client/src/pages/fantasy/CreateFantasy.css` - New styling
- `client/src/App.jsx` - Removed setup-teams routes

## Post-Migration Notes

- All existing leagues will be marked as 'public'
- Existing leagues without tournament_id will have NULL values
- Setup Teams and Setup Squads components are no longer used
- League creation now directly creates the league without additional steps

## Support

If you encounter any issues during migration, check:
1. Database connection settings
2. User permissions (need ALTER TABLE privileges)
3. Existing data constraints
4. Error logs in server.log

For assistance, review the error messages and ensure all prerequisites are met.
