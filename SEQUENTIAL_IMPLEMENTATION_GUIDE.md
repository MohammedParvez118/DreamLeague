# Sequential Playing XI Implementation Guide

## 📦 Files Created

### 1. Database Migration
- `migrations/add_transfer_limit_and_free_changes.sql` - SQL schema changes
- `migrations/run-transfer-limit-migration.js` - Migration script

### 2. New Controller
- `src/controllers/api/playingXiControllerSimplified.js` - Complete new implementation

---

## 🚀 Step-by-Step Implementation

### Step 1: Backup Current System

```bash
# Backup your current controller
cp src/controllers/api/playingXiController.js src/controllers/api/playingXiController.OLD.js

# Backup database
pg_dump -U your_user -d your_database > backup_$(date +%Y%m%d).sql
```

### Step 2: Run Database Migration

```bash
cd "/c/Users/admin/Documents/Fantasy-app - Backup"
node migrations/run-transfer-limit-migration.js
```

**Expected Output:**
```
🚀 Starting transfer limit migration...

1️⃣ Adding transfer_limit column to leagues...
   ✅ Done

2️⃣ Removing old tracking columns from fantasy_teams...
   ✅ Done

3️⃣ Adding new free change tracking columns...
   ✅ Done

4️⃣ Creating indexes for performance...
   ✅ Done

5️⃣ Setting default transfer limit for existing leagues...
   ✅ Updated X leagues

✅ Migration completed successfully!
```

### Step 3: Update Routes

**Option A: Replace existing routes** (recommended)

```javascript
// src/routes/api/playingXi.js

import express from 'express';
import { 
  getPlayingXI, 
  savePlayingXI, 
  deletePlayingXI,
  getTransferStats 
} from '../../controllers/api/playingXiControllerSimplified.js';

const router = express.Router();

// Get Playing XI for a match (with auto-prefill)
router.get('/:teamId/:matchId', getPlayingXI);

// Save Playing XI (with sequential validation)
router.post('/', savePlayingXI);

// Delete Playing XI
router.delete('/:teamId/:matchId', deletePlayingXI);

// Get transfer stats
router.get('/stats/:teamId', getTransferStats);

export default router;
```

**Option B: Create new routes for testing** (safer)

```javascript
// src/routes/api/playingXiNew.js

import express from 'express';
import { 
  getPlayingXI, 
  savePlayingXI, 
  deletePlayingXI,
  getTransferStats 
} from '../../controllers/api/playingXiControllerSimplified.js';

const router = express.Router();

router.get('/:teamId/:matchId', getPlayingXI);
router.post('/', savePlayingXI);
router.delete('/:teamId/:matchId', deletePlayingXI);
router.get('/stats/:teamId', getTransferStats);

export default router;

// In app.js, add:
// import playingXiNewRoutes from './routes/api/playingXiNew.js';
// app.use('/api/playing-xi-new', playingXiNewRoutes);
```

### Step 4: Update Frontend API Calls

**Old API structure:**
```javascript
// POST /api/league/:leagueId/team/:teamId/match/:matchId/playing-xi
```

**New API structure:**
```javascript
// POST /api/playing-xi
// Body: { teamId, matchId, leagueId, squad, captain, viceCaptain }
```

**Update your API service:**

```javascript
// client/src/services/api.js

export const playingXiAPI = {
  // Get Playing XI with auto-prefill
  get: async (teamId, matchId) => {
    const response = await axios.get(`/api/playing-xi/${teamId}/${matchId}`);
    return response.data;
  },

  // Save Playing XI
  save: async (teamId, matchId, leagueId, squad, captain, viceCaptain) => {
    const response = await axios.post('/api/playing-xi', {
      teamId,
      matchId,
      leagueId,
      squad,
      captain,
      viceCaptain
    });
    return response.data;
  },

  // Delete Playing XI
  delete: async (teamId, matchId) => {
    const response = await axios.delete(`/api/playing-xi/${teamId}/${matchId}`);
    return response.data;
  },

  // Get transfer stats
  getStats: async (teamId) => {
    const response = await axios.get(`/api/transfer-stats/${teamId}`);
    return response.data;
  }
};
```

### Step 5: Update Frontend Components

**Key changes needed in `PlayingXIForm.jsx`:**

1. **Handle auto-prefilled data:**

```javascript
useEffect(() => {
  const loadPlayingXI = async () => {
    try {
      const response = await playingXiAPI.get(teamId, matchId);
      
      if (!response.data.canEdit) {
        // Show error message
        setError(response.data.errorMessage);
        setCanEdit(false);
        return;
      }
      
      // Auto-prefilled lineup
      const lineup = response.data.lineup;
      setSelectedPlayers(lineup);
      
      // Set captain/VC
      const captain = lineup.find(p => p.is_captain);
      const vc = lineup.find(p => p.is_vice_captain);
      setCaptain(captain?.player_id);
      setViceCaptain(vc?.player_id);
      
      // Show notification if auto-prefilled
      if (lineup.some(p => p.autoPrefilled)) {
        showNotification('Lineup auto-loaded from previous match');
      }
      
      // Transfer stats
      setTransferStats(response.data.transferStats);
      
    } catch (error) {
      console.error('Error loading Playing XI:', error);
      setError(error.response?.data?.error || 'Failed to load');
    }
  };
  
  loadPlayingXI();
}, [teamId, matchId]);
```

2. **Display transfer changes:**

```jsx
{transferStats && (
  <div className="transfer-stats">
    <div className="stat-card">
      <h4>Transfers Remaining</h4>
      <p className="big-number">
        {transferStats.transfersRemaining} / {transferStats.transferLimit}
      </p>
    </div>
    
    <div className="stat-card">
      <h4>Captain Free Change</h4>
      <p>
        {transferStats.captainFreeChangeUsed ? (
          <span className="used">✅ Used</span>
        ) : (
          <span className="available">🆓 Available</span>
        )}
      </p>
      <small>Next change costs 1 transfer</small>
    </div>
    
    <div className="stat-card">
      <h4>Vice-Captain Free Change</h4>
      <p>
        {transferStats.vcFreeChangeUsed ? (
          <span className="used">✅ Used</span>
        ) : (
          <span className="available">🆓 Available</span>
        )}
      </p>
      <small>Next change costs 1 transfer</small>
    </div>
  </div>
)}
```

3. **Show transfer preview before save:**

```jsx
{playersAdded.length > 0 && (
  <div className="transfer-preview">
    <h4>Changes Preview</h4>
    
    {playersAdded.map(p => (
      <div key={p.id} className="player-added">
        ➕ {p.name} <span className="badge green">+1 transfer</span>
      </div>
    ))}
    
    {playersRemoved.map(p => (
      <div key={p.id} className="player-removed">
        ➖ {p.name}
      </div>
    ))}
    
    {captainChanged && (
      <div className="captain-changed">
        👑 Captain changed
        {!transferStats.captainFreeChangeUsed ? (
          <span className="badge green">Free change</span>
        ) : (
          <span className="badge yellow">+1 transfer</span>
        )}
      </div>
    )}
    
    <div className="total-cost">
      <strong>Total cost:</strong> {totalTransfers} transfers
    </div>
  </div>
)}
```

### Step 6: Update Match List UI

**Disable unavailable matches:**

```jsx
// MatchList.jsx

const MatchCard = ({ match, hasPreviousLineup, previousMatchLocked }) => {
  const isLocked = new Date() >= new Date(match.match_start);
  const canAccess = !isLocked && previousMatchLocked && hasPreviousLineup;
  
  return (
    <div 
      className={`match-card ${isLocked ? 'locked' : ''} ${!canAccess ? 'disabled' : ''}`}
      onClick={() => canAccess && navigate(`/playing-xi/${match.id}`)}
    >
      <h3>Match {match.id}</h3>
      <p>{new Date(match.match_start).toLocaleString()}</p>
      
      {isLocked && (
        <span className="badge locked">🔒 Locked</span>
      )}
      
      {!isLocked && !previousMatchLocked && (
        <span className="badge disabled">⏳ Previous match not started</span>
      )}
      
      {!isLocked && previousMatchLocked && !hasPreviousLineup && (
        <span className="badge disabled">❌ Save previous lineup first</span>
      )}
      
      {canAccess && (
        <span className="badge available">✅ Available</span>
      )}
    </div>
  );
};
```

---

## 🧪 Testing Checklist

### Test 1: First Match
- [ ] Open first match (no previous match)
- [ ] Select 11 players + captain + VC
- [ ] Save successfully
- [ ] Transfers used = 0

### Test 2: Sequential Access
- [ ] First match locked (deadline passed)
- [ ] Second match opens automatically
- [ ] Lineup auto-prefilled from first match
- [ ] Can edit and save

### Test 3: Block Skip
- [ ] Match 1 saved, Match 2 NOT saved
- [ ] Try to open Match 3
- [ ] Should show error: "Save Match 2 first"

### Test 4: Transfer Counting
- [ ] Change 2 players in Match 2
- [ ] Save shows: "2 transfers used"
- [ ] Change captain (first time)
- [ ] Shows: "Free captain change used"
- [ ] Change captain again in Match 3
- [ ] Shows: "+1 transfer for captain change"

### Test 5: Transfer Limit
- [ ] Make changes that exceed limit
- [ ] Save blocked with error message
- [ ] Shows remaining transfers

### Test 6: Locked Match
- [ ] Try to edit past match (deadline passed)
- [ ] Should show: "Match locked"
- [ ] Form disabled

---

## 🐛 Rollback Plan

If something goes wrong:

```bash
# Restore database
psql -U your_user -d your_database < backup_YYYYMMDD.sql

# Revert code
mv src/controllers/api/playingXiController.OLD.js src/controllers/api/playingXiController.js

# Restart server
npm run dev
```

---

## 📊 Comparison: Old vs New

| Feature | Old System | New System |
|---------|-----------|------------|
| **Baseline** | Calculate from locked matches | Previous match |
| **Transfer Tracking** | Cumulative from baseline | Match-to-match |
| **Captain Changes** | 1 max, complex logic | 1 free, then costs transfer |
| **Match Access** | Any unlocked match | Sequential only |
| **Auto-prefill** | ❌ No | ✅ Yes |
| **Transfer Limit** | Hardcoded 10 | Admin configurable |
| **Code Lines** | ~1074 | ~750 |
| **Complexity** | High | Low |

---

## 🎯 Next Steps

1. ✅ Run migration script
2. ✅ Test new API endpoints (use Postman/Insomnia)
3. ✅ Update frontend API calls
4. ✅ Update UI components
5. ✅ Test all scenarios
6. ✅ Deploy to production

---

## 💡 Pro Tips

1. **Test with new route first** (`/api/playing-xi-new`) before replacing old
2. **Keep old controller as backup** for 1-2 weeks
3. **Monitor logs** for any errors during rollout
4. **Communicate changes** to users (new UI, auto-prefill feature)

---

## 🆘 Support

If you encounter issues:
1. Check migration ran successfully
2. Verify database schema matches expectations
3. Test API endpoints with Postman
4. Check browser console for frontend errors
5. Review server logs for backend errors

**Common Issues:**

- **"Previous match not saved"** → Check team_playing_xi table has data
- **"Transfer limit exceeded"** → Check leagues.transfer_limit value
- **"Cannot edit"** → Check match_start timestamp and current time

---

Ready to implement? Let me know if you want me to:
1. Update your existing routes
2. Create test data script
3. Create frontend component examples
4. Help with specific integration points
