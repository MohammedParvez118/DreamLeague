# 🛠️ Development Guide

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL 12+
- Git

### Initial Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd Fantasy-app
   npm install
   cd client && npm install && cd ..
   ```

2. **Database Setup**
   ```bash
   # Create database
   createdb Fantasy
   
   # Run migrations
   psql -d Fantasy -f migrations/create_users_table.sql
   psql -d Fantasy -f migrations/add_tournament_dates.sql
   psql -d Fantasy -f migrations/add_league_created_by.sql
   psql -d Fantasy -f migrations/create-test-users.sql
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Start Development Servers**
   
   **Option A: Manual (Two terminals)**
   ```bash
   # Terminal 1 - Backend
   npm start
   
   # Terminal 2 - Frontend
   cd client && npm run dev
   ```
   
   **Option B: Scripts**
   ```bash
   # Windows
   start-dev.bat
   
   # Linux/Mac
   ./scripts/dev/start-dev.sh
   ```

5. **Access**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

---

## Project Structure

```
Fantasy-app/
├── app.js                    # Backend entry point (Express server)
├── package.json              # Backend dependencies
│
├── client/                   # React frontend
│   ├── src/
│   │   ├── main.jsx         # React entry point
│   │   ├── App.jsx          # Main app component
│   │   ├── components/      # Reusable components
│   │   ├── layouts/         # Layout components
│   │   ├── pages/           # Page components
│   │   │   ├── Auth.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Tournaments.jsx
│   │   │   ├── JoinLeague.jsx
│   │   │   ├── fantasy/     # Fantasy-related pages
│   │   │   ├── league/      # League-related pages
│   │   │   └── tournament/  # Tournament-related pages
│   │   └── services/        # API client
│   ├── package.json         # Frontend dependencies
│   └── vite.config.js       # Vite configuration
│
├── src/                      # Backend source
│   ├── config/
│   │   └── database.js      # PostgreSQL connection
│   ├── controllers/api/     # API controllers
│   │   ├── authApiController.js
│   │   ├── homeApiController.js
│   │   ├── tournamentApiController.js
│   │   ├── fantasyApiController.js
│   │   └── leagueApiController.js
│   ├── middleware/
│   │   └── errorHandler.js  # Error handling middleware
│   ├── routes/api/
│   │   └── index.js         # API route definitions
│   ├── services/
│   │   └── apiService.js    # RapidAPI integration + mock data
│   └── utils/
│       └── helpers.js       # Utility functions
│
├── migrations/               # Database migrations
│   ├── create_users_table.sql
│   ├── add_tournament_dates.sql
│   ├── add_league_created_by.sql
│   └── create-test-users.sql
│
├── scripts/                  # Utility scripts
│   ├── db/                  # Database utilities
│   │   ├── check-schema.js
│   │   ├── update-tournament-dates.js
│   │   ├── migrate-fantasy-leagues.js
│   │   └── check-db-structure.js
│   └── dev/                 # Development scripts
│       ├── start-dev.bat
│       └── start-dev.sh
│
└── docs/                     # Documentation
    ├── FEATURES.md          # Feature documentation
    ├── AUTHENTICATION_GUIDE.md
    ├── EMAIL_CONFIGURATION.md
    └── DEVELOPMENT.md       # This file
```

---

## Development Workflow

### DEV Mode (Recommended for Development)

**Why use DEV Mode?**
- ✅ No RapidAPI calls = No rate limits
- ✅ Faster testing with mock data
- ✅ Work offline
- ✅ Predictable test data

**Enable DEV Mode:**

1. **Environment Variable (Backend)**
   ```bash
   # .env
   DEV_MODE=true
   ```

2. **Frontend Toggle**
   - Settings menu → "Enable DEV Mode"
   - Stored in localStorage

**Mock Data Behavior:**

When adding a tournament in DEV mode:
```javascript
// Returns mock data instead of RapidAPI call
{
  seriesId: Math.floor(Math.random() * 10000),
  name: "DEV Test Series",
  type: "international",
  year: 2025,
  startDate: Date.now(),
  endDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
  matches: [/* mock matches */],
  squads: [/* mock squads */]
}
```

---

## Common Development Tasks

### Adding a New Feature

1. **Backend API Endpoint**
   ```javascript
   // src/controllers/api/yourController.js
   export const yourFunction = async (req, res) => {
     try {
       // Your logic
       res.json({ success: true, data: result });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: error.message });
     }
   };
   ```

2. **Register Route**
   ```javascript
   // src/routes/api/index.js
   import { yourFunction } from '../../controllers/api/yourController.js';
   
   router.post('/your-endpoint', yourFunction);
   ```

3. **Frontend API Call**
   ```javascript
   // client/src/services/api.js
   export const yourAPI = {
     yourMethod: async (data) => {
       const res = await fetch('/api/your-endpoint', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(data),
         credentials: 'include'
       });
       return res.json();
     }
   };
   ```

4. **Use in Component**
   ```jsx
   // client/src/pages/YourPage.jsx
   import { yourAPI } from '../services/api';
   
   const handleAction = async () => {
     const result = await yourAPI.yourMethod(data);
     if (result.success) {
       // Handle success
     }
   };
   ```

### Database Migration

1. **Create Migration File**
   ```sql
   -- migrations/your_migration.sql
   ALTER TABLE your_table ADD COLUMN new_column VARCHAR(255);
   ```

2. **Run Migration**
   ```bash
   psql -d Fantasy -f migrations/your_migration.sql
   ```

3. **Verify**
   ```bash
   node scripts/db/check-schema.js
   ```

### Testing API Endpoints

**Using curl:**
```bash
# GET request
curl http://localhost:3000/api/tournaments

# POST with authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# With cookie (after login)
curl http://localhost:3000/api/home \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"
```

**Using test script:**
```bash
# Edit test-api.sh with your tests
chmod +x test-api.sh
./test-api.sh
```

---

## Database Management

### Connect to Database
```bash
psql -d Fantasy
```

### Useful Queries

**Check Users:**
```sql
SELECT id, email, is_verified FROM users;
```

**Check Tournaments:**
```sql
SELECT series_id, name, type, 
  TO_TIMESTAMP(start_date/1000) as start, 
  TO_TIMESTAMP(end_date/1000) as end 
FROM tournaments;
```

**Check Leagues:**
```sql
SELECT fl.id, fl.league_name, fl.league_code, 
  fl.created_by, t.name as tournament
FROM fantasy_leagues fl
LEFT JOIN tournaments t ON fl.tournament_id = t.series_id;
```

**Check League Status:**
```sql
SELECT 
  fl.league_name,
  t.name as tournament,
  CASE 
    WHEN t.end_date IS NULL THEN 'unknown'
    WHEN EXTRACT(EPOCH FROM NOW()) * 1000 < t.end_date THEN 'ongoing'
    ELSE 'completed'
  END as status
FROM fantasy_leagues fl
LEFT JOIN tournaments t ON fl.tournament_id = t.series_id;
```

### Reset Database
```bash
# Drop and recreate
dropdb Fantasy
createdb Fantasy

# Run all migrations
psql -d Fantasy -f migrations/create_users_table.sql
psql -d Fantasy -f migrations/add_tournament_dates.sql
psql -d Fantasy -f migrations/add_league_created_by.sql
psql -d Fantasy -f migrations/create-test-users.sql
```

---

## Debugging

### Backend Debugging

**Enable Detailed Logs:**
```javascript
// app.js - Add after imports
import morgan from 'morgan';
app.use(morgan('dev')); // Logs all HTTP requests
```

**Check Server Logs:**
```bash
# If using background process
tail -f server.log

# Or start in foreground
node app.js
```

**Common Issues:**

1. **Port 3000 already in use**
   ```bash
   # Windows
   taskkill //F //IM node.exe
   
   # Linux/Mac
   pkill -f "node.*app.js"
   lsof -ti:3000 | xargs kill -9
   ```

2. **Database connection failed**
   - Check PostgreSQL is running: `pg_isready`
   - Verify .env credentials
   - Check database exists: `psql -l`

3. **Module not found**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Frontend Debugging

**React DevTools:**
- Install browser extension
- Inspect component state and props

**Network Tab:**
- Open DevTools (F12)
- Check Network tab for API calls
- Look for failed requests (red)

**Console Logs:**
```javascript
// Add in your component
useEffect(() => {
  console.log('Component state:', { leagues, user, loading });
}, [leagues, user, loading]);
```

**Common Issues:**

1. **Blank page / White screen**
   - Check browser console for errors
   - Verify backend is running
   - Clear browser cache (Ctrl+Shift+Del)

2. **API calls failing**
   - Check backend is running on port 3000
   - Verify session/authentication
   - Check CORS settings in app.js

3. **Vite build errors**
   ```bash
   cd client
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```

---

## Testing

### Test Users

Created by `migrations/create-test-users.sql`:

| Email | Password | Verified |
|-------|----------|----------|
| test1@example.com | Test123! | ✅ |
| test2@example.com | Test123! | ✅ |
| creator@test.com | Test123! | ✅ |

### Manual Testing Workflow

1. **Register/Login**
   - Test registration flow
   - Verify email verification works
   - Test login with verified account

2. **Add Tournament**
   - Enable DEV_MODE
   - Add tournament with mock data
   - Verify tournament appears in list

3. **Create League**
   - Create public league
   - Create private league
   - Test auto-add creator option

4. **Join League**
   - Copy league code
   - Login as different user
   - Join league with code

5. **Setup Team**
   - Name your team
   - Select 11 players
   - Save squad

6. **Delete Operations**
   - Try deleting ongoing league (should fail)
   - Try deleting as non-creator (should fail)
   - Delete completed league as creator (should succeed)

---

## Performance Tips

### Backend

1. **Use indexes on frequently queried columns**
   ```sql
   CREATE INDEX idx_league_code ON fantasy_leagues(league_code);
   CREATE INDEX idx_team_owner ON fantasy_teams(team_owner);
   ```

2. **Limit query results**
   ```javascript
   const tournaments = await db.query(
     'SELECT * FROM tournaments ORDER BY created_at DESC LIMIT 50'
   );
   ```

3. **Use connection pooling**
   ```javascript
   // Already configured in src/config/database.js
   const pool = new Pool({ max: 20 });
   ```

### Frontend

1. **Code splitting**
   ```javascript
   // Lazy load pages
   const ViewLeague = lazy(() => import('./pages/league/ViewLeague'));
   ```

2. **Memoize expensive calculations**
   ```javascript
   const sortedLeagues = useMemo(() => 
     leagues.sort((a, b) => b.created_at - a.created_at),
     [leagues]
   );
   ```

3. **Debounce search inputs**
   ```javascript
   const debouncedSearch = debounce((value) => {
     setSearchTerm(value);
   }, 300);
   ```

---

## Deployment

### Production Checklist

- [ ] Set `DEV_MODE=false` in .env
- [ ] Update RAPIDAPI_KEY with production key
- [ ] Set strong SESSION_SECRET
- [ ] Configure email service (if using)
- [ ] Build frontend: `cd client && npm run build`
- [ ] Set up reverse proxy (nginx/Apache)
- [ ] Configure SSL/TLS certificates
- [ ] Set up database backups
- [ ] Configure error logging (e.g., Sentry)
- [ ] Set NODE_ENV=production

### Build Frontend for Production
```bash
cd client
npm run build
# Output in client/dist/
```

### Serve with Express
```javascript
// app.js
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}
```

---

## Contributing Guidelines

1. **Branch Naming**
   - Feature: `feature/your-feature-name`
   - Bug fix: `bugfix/issue-description`
   - Hotfix: `hotfix/critical-issue`

2. **Commit Messages**
   ```
   feat: Add league deletion feature
   fix: Resolve session timeout issue
   docs: Update API documentation
   refactor: Simplify tournament controller
   ```

3. **Code Style**
   - Use ES6+ features
   - Async/await over callbacks
   - Meaningful variable names
   - Comment complex logic

4. **Pull Request Process**
   - Create feature branch
   - Make changes with clear commits
   - Test thoroughly
   - Create PR with description
   - Address review feedback

---

## Useful Commands Reference

### NPM Scripts

**Backend:**
```bash
npm start          # Start backend server
npm run dev        # Start with nodemon (auto-reload)
```

**Frontend:**
```bash
cd client
npm run dev        # Start Vite dev server
npm run build      # Build for production
npm run preview    # Preview production build
```

### Database Scripts

```bash
# Check database schema
node scripts/db/check-schema.js

# Update tournament dates
node scripts/db/update-tournament-dates.js

# Check database structure
node scripts/db/check-db-structure.js

# Migrate fantasy leagues
node scripts/db/migrate-fantasy-leagues.js
```

### Git

```bash
# Start new feature
git checkout -b feature/my-feature

# Stage changes
git add .

# Commit
git commit -m "feat: Add my feature"

# Push
git push origin feature/my-feature
```

---

## Resources

### Documentation
- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

### APIs
- [RapidAPI - Cricbuzz](https://rapidapi.com/cricketapilive/api/cricbuzz-cricket/)

### Tools
- [Postman](https://www.postman.com/) - API testing
- [pgAdmin](https://www.pgadmin.org/) - PostgreSQL GUI
- [React DevTools](https://react.dev/learn/react-developer-tools)

---

## Support

For questions or issues:
1. Check `docs/FEATURES.md` for feature-specific help
2. Review this development guide
3. Check `docs/AUTHENTICATION_GUIDE.md` for auth issues
4. Check `docs/EMAIL_CONFIGURATION.md` for email setup
5. Search existing issues on GitHub
6. Create new issue with detailed description

---

## License

[Your License Here]
