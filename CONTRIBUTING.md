# Contributing to Fantasy Cricket App

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/Fantasy-app.git
   cd Fantasy-app
   ```
3. **Set up development environment**
   - See `docs/DEVELOPMENT.md` for complete setup instructions

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

**Branch naming conventions:**
- `feature/` - New features
- `bugfix/` - Bug fixes
- `hotfix/` - Critical production fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

### 2. Make Your Changes

- Write clean, readable code
- Follow existing code style
- Add comments for complex logic
- Update documentation if needed

### 3. Test Thoroughly

**Backend testing:**
```bash
# Start backend
npm start

# Test API endpoints
curl http://localhost:3000/api/your-endpoint
```

**Frontend testing:**
```bash
cd client
npm run dev
# Manual testing in browser
```

**Database testing:**
```bash
# Verify schema changes
node scripts/db/check-schema.js
```

### 4. Commit Your Changes

Use meaningful commit messages following conventional commits:

```bash
git add .
git commit -m "feat: Add league deletion feature"
```

**Commit message format:**
```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, no logic change)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Build process, dependencies, etc.

**Examples:**
```
feat: Add tournament deletion with validation
fix: Resolve session timeout on page refresh
docs: Update API documentation for league endpoints
refactor: Simplify database query in homeApiController
```

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Code Style Guidelines

### JavaScript/JSX

**Use ES6+ features:**
```javascript
// ✅ Good
const getData = async () => {
  const result = await api.fetch();
  return result;
};

// ❌ Avoid
function getData() {
  return api.fetch().then(function(result) {
    return result;
  });
}
```

**Destructuring:**
```javascript
// ✅ Good
const { email, password } = req.body;

// ❌ Avoid
const email = req.body.email;
const password = req.body.password;
```

**Arrow functions:**
```javascript
// ✅ Good
const handleClick = () => {
  console.log('Clicked');
};

// ❌ Avoid
function handleClick() {
  console.log('Clicked');
}
```

### React Components

**Functional components with hooks:**
```javascript
// ✅ Good
const MyComponent = () => {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  return <div>{data.map(item => <Item key={item.id} {...item} />)}</div>;
};
```

**PropTypes or TypeScript (future):**
```javascript
MyComponent.propTypes = {
  data: PropTypes.array.isRequired,
  onUpdate: PropTypes.func
};
```

### SQL

**Use parameterized queries:**
```javascript
// ✅ Good
await db.query('SELECT * FROM users WHERE email = $1', [email]);

// ❌ Avoid (SQL injection risk)
await db.query(`SELECT * FROM users WHERE email = '${email}'`);
```

**Consistent formatting:**
```sql
-- ✅ Good
SELECT 
  fl.*,
  t.name as tournament_name,
  COUNT(ft.id) as teams_added
FROM fantasy_leagues fl
LEFT JOIN tournaments t ON fl.tournament_id = t.series_id
LEFT JOIN fantasy_teams ft ON fl.id = ft.league_id
GROUP BY fl.id, t.name;
```

### Error Handling

**Always use try-catch:**
```javascript
// ✅ Good
export const getData = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM table');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error in getData:', error);
    res.status(500).json({ error: error.message });
  }
};
```

**Frontend error handling:**
```javascript
// ✅ Good
const fetchData = async () => {
  try {
    setLoading(true);
    const result = await api.getData();
    setData(result.data);
  } catch (error) {
    setError(error.message);
    console.error('Failed to fetch data:', error);
  } finally {
    setLoading(false);
  }
};
```

## Database Changes

### Creating Migrations

1. **Create SQL file** in `migrations/` folder:
   ```sql
   -- migrations/add_new_column.sql
   ALTER TABLE your_table ADD COLUMN new_column VARCHAR(255);
   
   -- Add index if needed
   CREATE INDEX idx_new_column ON your_table(new_column);
   ```

2. **Document in migration README:**
   ```markdown
   ## Migration: add_new_column.sql
   **Date:** 2025-01-20
   **Purpose:** Add new_column to support feature X
   **Usage:** `psql -d Fantasy -f migrations/add_new_column.sql`
   ```

3. **Test locally:**
   ```bash
   psql -d Fantasy -f migrations/add_new_column.sql
   node scripts/db/check-schema.js
   ```

## API Endpoints

### Creating New Endpoints

**1. Controller** (`src/controllers/api/yourController.js`):
```javascript
export const yourEndpoint = async (req, res) => {
  try {
    const { param1, param2 } = req.body;
    
    // Validate input
    if (!param1) {
      return res.status(400).json({ error: 'param1 is required' });
    }
    
    // Database operation
    const result = await db.query(
      'SELECT * FROM table WHERE column = $1',
      [param1]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error in yourEndpoint:', error);
    res.status(500).json({ error: error.message });
  }
};
```

**2. Route** (`src/routes/api/index.js`):
```javascript
import { yourEndpoint } from '../../controllers/api/yourController.js';

router.post('/your-endpoint', yourEndpoint);
```

**3. Frontend API** (`client/src/services/api.js`):
```javascript
export const yourAPI = {
  yourMethod: async (data) => {
    const res = await fetch('/api/your-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  }
};
```

**4. Documentation** - Update `docs/FEATURES.md`:
```markdown
### Your Feature

**Endpoint:** `POST /api/your-endpoint`

**Request:**
```json
{
  "param1": "value1",
  "param2": "value2"
}
```

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```
```

## Testing Checklist

Before submitting a pull request:

### Backend
- [ ] All endpoints return proper status codes
- [ ] Error handling for all database queries
- [ ] Input validation for all user inputs
- [ ] No SQL injection vulnerabilities
- [ ] Console.log statements removed (except intentional logs)
- [ ] Tested with both valid and invalid inputs

### Frontend
- [ ] No console errors in browser
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Loading states implemented
- [ ] Error messages displayed to user
- [ ] Forms validate input
- [ ] Buttons show appropriate states (loading, disabled)
- [ ] Tested in Chrome, Firefox, Safari

### Database
- [ ] Migrations run successfully
- [ ] Schema validated with check-schema.js
- [ ] Indexes added for performance
- [ ] Foreign keys and constraints defined
- [ ] Cascade deletes configured properly

## Pull Request Guidelines

### PR Title
Use the same format as commit messages:
```
feat: Add league deletion feature
fix: Resolve session timeout issue
```

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Changed file1 to do X
- Added file2 for Y
- Updated file3 to fix Z

## Testing
- [ ] Tested locally
- [ ] Tested with DEV_MODE
- [ ] Tested API endpoints
- [ ] Tested UI in browser

## Screenshots (if applicable)
[Add screenshots here]

## Related Issues
Closes #123
```

## Code Review Process

1. **Automated checks** (if configured)
   - Linting
   - Tests
   - Build success

2. **Manual review**
   - Code quality
   - Logic correctness
   - Security concerns
   - Documentation

3. **Feedback**
   - Address reviewer comments
   - Make requested changes
   - Update PR

4. **Merge**
   - Approved by maintainer
   - Squash and merge (usually)

## Best Practices

### Security
- Never commit `.env` files
- Use environment variables for secrets
- Validate all user inputs
- Use parameterized SQL queries
- Hash passwords with bcrypt
- Use httpOnly cookies for sessions

### Performance
- Add database indexes for frequently queried columns
- Limit query results (use LIMIT)
- Use React.memo for expensive components
- Lazy load routes and components
- Optimize images and assets

### Accessibility
- Use semantic HTML
- Add aria-labels where needed
- Ensure keyboard navigation works
- Maintain color contrast ratios
- Test with screen readers

### Documentation
- Update README.md if needed
- Document new API endpoints
- Add JSDoc comments for complex functions
- Update FEATURES.md for new features

## Common Issues

### "Module not found" error
```bash
rm -rf node_modules package-lock.json
npm install
```

### Database connection failed
```bash
# Check PostgreSQL is running
pg_isready

# Verify database exists
psql -l | grep Fantasy

# Check .env credentials
cat .env
```

### Port already in use
```bash
# Windows
taskkill //F //IM node.exe

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

## Questions?

- Review `docs/DEVELOPMENT.md` for setup help
- Check `docs/FEATURES.md` for feature documentation
- Search existing issues on GitHub
- Ask in discussion forum

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
