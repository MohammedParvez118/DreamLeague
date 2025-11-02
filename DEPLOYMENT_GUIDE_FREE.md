# Fantasy Cricket App - Free Deployment Guide 🚀

## 📋 Your Tech Stack
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Frontend**: React (Vite)
- **Architecture**: Separate client/server

---

## 🎯 RECOMMENDED: Render.com (All-in-One Solution)

### ✅ Why Render?
- **100% FREE** for small apps
- PostgreSQL database included (free tier)
- Easy deployment from GitHub
- Automatic SSL certificates
- No credit card required
- Auto-reconnection to DB built-in

### 📦 What You Get Free
- **Web Service**: 750 hours/month (enough for 1 app running 24/7)
- **PostgreSQL DB**: 1GB storage, 90 days retention
- **Static Site**: Unlimited bandwidth
- **Custom domain**: Supported

---

## 🛠️ DEPLOYMENT PLAN

### Option A: Render.com (RECOMMENDED)

#### Architecture:
```
┌─────────────────────────────────────────────────┐
│  Render.com (Free Tier)                         │
│                                                  │
│  ┌────────────────┐      ┌──────────────────┐  │
│  │  Web Service   │─────▶│  PostgreSQL DB   │  │
│  │  (Backend API) │      │  (Free 1GB)      │  │
│  │  Port 10000    │      └──────────────────┘  │
│  └────────────────┘                             │
│         │                                        │
│         ▼                                        │
│  ┌────────────────┐                             │
│  │  Static Site   │                             │
│  │  (React App)   │                             │
│  └────────────────┘                             │
└─────────────────────────────────────────────────┘
```

---

## 📝 STEP-BY-STEP DEPLOYMENT (Render.com)

### Phase 1: Prepare Your Code

#### 1.1 Create Production Build Script
Add to `package.json` (root):
```json
{
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "build": "cd client && npm install && npm run build",
    "install-all": "npm install && cd client && npm install"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### 1.2 Update Database Connection
Create `src/config/database.js`:
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  // Connection pool settings for stability
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Auto-reconnection on error
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('✅ Database connected:', res.rows[0].now);
  }
});

module.exports = pool;
```

#### 1.3 Environment Variables
Create `.env.example` (for reference):
```env
# Server
PORT=3000
NODE_ENV=production

# Database (Render will provide this)
DATABASE_URL=your_database_url_here

# JWT
JWT_SECRET=your-super-secret-key-change-this

# CORS (your frontend URL)
CLIENT_URL=https://your-app.onrender.com
```

#### 1.4 Update CORS in `app.js`
```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
```

#### 1.5 Serve Static Files (Optional - if serving React from backend)
Add to `app.js`:
```javascript
const path = require('path');

// Serve static files from React build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
  
  // Handle React routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}
```

---

### Phase 2: Push to GitHub

#### 2.1 Initialize Git (if not done)
```bash
cd '/c/Users/admin/Documents/Fantasy-app - Backup'
git init
git add .
git commit -m "Initial commit - Fantasy Cricket App MVP"
```

#### 2.2 Create GitHub Repository
1. Go to https://github.com/new
2. Name: `fantasy-cricket-app`
3. Description: "Fantasy Cricket Application - MVP"
4. Keep it **Public** (required for free Render deployment)
5. Click "Create repository"

#### 2.3 Push Code
```bash
git remote add origin https://github.com/YOUR_USERNAME/fantasy-cricket-app.git
git branch -M main
git push -u origin main
```

---

### Phase 3: Deploy on Render.com

#### 3.1 Create Render Account
1. Go to https://render.com
2. Sign up with GitHub (recommended)
3. Authorize Render to access your repositories

#### 3.2 Deploy PostgreSQL Database
1. Click **"New +"** → **"PostgreSQL"**
2. **Name**: `fantasy-cricket-db`
3. **Database**: `fantasyapp` (or any name)
4. **User**: Auto-generated
5. **Region**: Choose nearest to your users
6. **Plan**: **Free**
7. Click **"Create Database"**
8. ⏳ Wait 2-3 minutes for provisioning
9. 📋 **Copy the "Internal Database URL"** (you'll need this)

#### 3.3 Deploy Backend (Web Service)
1. Click **"New +"** → **"Web Service"**
2. **Connect Repository**: Select `fantasy-cricket-app`
3. Configure:
   - **Name**: `fantasy-cricket-backend`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: Leave blank (or `.` if needed)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node app.js`
   - **Plan**: **Free**

4. **Environment Variables** (click "Advanced"):
   ```
   DATABASE_URL = [paste the Internal Database URL from step 3.2]
   NODE_ENV = production
   JWT_SECRET = your-random-secret-key-here
   CLIENT_URL = https://fantasy-cricket-frontend.onrender.com
   PORT = 10000
   ```

5. Click **"Create Web Service"**
6. ⏳ Wait 5-10 minutes for build & deploy
7. 📋 **Copy your backend URL**: `https://fantasy-cricket-backend.onrender.com`

#### 3.4 Deploy Frontend (Static Site)
1. Click **"New +"** → **"Static Site"**
2. **Connect Repository**: Select `fantasy-cricket-app`
3. Configure:
   - **Name**: `fantasy-cricket-frontend`
   - **Branch**: `main`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. **Environment Variables**:
   ```
   VITE_API_URL = https://fantasy-cricket-backend.onrender.com
   ```

5. Click **"Create Static Site"**
6. ⏳ Wait 3-5 minutes for build

---

### Phase 4: Configure Database Schema

#### 4.1 Connect to Render PostgreSQL
Use Render's Web Shell or connect via psql:
```bash
psql YOUR_EXTERNAL_DATABASE_URL
```

#### 4.2 Run Your Schema
```sql
-- Copy all your CREATE TABLE statements
-- From your local database dump
```

**OR** Create a migration script:
```bash
# In your project root
node scripts/migrate-db.js
```

Create `scripts/migrate-db.js`:
```javascript
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('✅ Database migrated successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
```

---

### Phase 5: Update Frontend API URLs

#### 5.1 Create `.env.production` in `client/` folder:
```env
VITE_API_URL=https://fantasy-cricket-backend.onrender.com
```

#### 5.2 Update API Service (`client/src/services/api.js`):
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Use this in all API calls
axios.defaults.baseURL = API_BASE_URL;
```

---

## 🔄 AUTO-RECONNECTION STRATEGIES

### Database Connection Resilience
Already implemented in `database.js` above:
- ✅ Connection pooling (max 20 connections)
- ✅ Auto-reconnect on error
- ✅ Idle timeout (30s)
- ✅ Connection timeout (10s)

### Handle Free Tier Sleep (Render Web Services sleep after 15 min inactivity)

Add to `app.js`:
```javascript
// Keep-alive ping (prevents sleep)
if (process.env.NODE_ENV === 'production') {
  const KEEP_ALIVE_URL = process.env.RENDER_EXTERNAL_URL;
  
  setInterval(() => {
    axios.get(`${KEEP_ALIVE_URL}/api/health`)
      .then(() => console.log('Keep-alive ping'))
      .catch(err => console.error('Keep-alive failed:', err.message));
  }, 14 * 60 * 1000); // Every 14 minutes
}
```

---

## 💰 COST BREAKDOWN (Free Tier Limits)

### Render.com Free Tier:
| Resource | Limit | Your Usage |
|----------|-------|------------|
| Web Service | 750 hrs/month | ~720 hrs (1 app) ✅ |
| PostgreSQL | 1GB storage | ~100-500MB ✅ |
| Static Site | Unlimited | N/A ✅ |
| Bandwidth | 100GB/month | ~5-10GB ✅ |
| Build minutes | 500/month | ~10-20 mins ✅ |

**Limitations**:
- Web services sleep after 15 minutes of inactivity (50s cold start)
- PostgreSQL limited to 1GB
- Shared CPU (slower performance)

---

## 🎛️ ALTERNATIVE OPTIONS

### Option B: Railway.app
- Similar to Render
- $5/month credit (free trial)
- PostgreSQL included
- GitHub integration
- https://railway.app

### Option C: Fly.io
- 3 VMs free (256MB RAM each)
- PostgreSQL: 1GB free
- More technical (requires Dockerfile)
- https://fly.io

### Option D: Vercel (Frontend) + Supabase (Backend + DB)
- **Vercel**: Free React hosting
- **Supabase**: Free PostgreSQL (500MB) + Auth
- Split deployment
- https://vercel.com + https://supabase.com

### Option E: Netlify (Frontend) + Render (Backend + DB)
- **Netlify**: Free static hosting
- **Render**: Backend + DB
- Best performance for frontend

---

## 🐛 TROUBLESHOOTING

### Issue 1: Database Connection Failed
```javascript
// Add retry logic
async function connectWithRetry(retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Database connected');
      return;
    } catch (err) {
      console.log(`Retry ${i + 1}/${retries}...`);
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  throw new Error('Failed to connect to database');
}
```

### Issue 2: CORS Errors
Update `app.js`:
```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-frontend.onrender.com',
    'https://your-custom-domain.com'
  ],
  credentials: true
}));
```

### Issue 3: Build Fails
Check `package.json` engines:
```json
"engines": {
  "node": "18.x",
  "npm": "9.x"
}
```

---

## 📊 MONITORING & LOGS

### Render Dashboard:
1. Click on your service
2. Go to **"Logs"** tab
3. View real-time logs
4. Monitor errors and performance

### Health Check Endpoint:
Add to `app.js`:
```javascript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected'
  });
});
```

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Code pushed to GitHub
- [ ] `.env` variables configured
- [ ] Database connection uses `DATABASE_URL`
- [ ] CORS configured for production domain
- [ ] PostgreSQL database created on Render
- [ ] Backend web service deployed
- [ ] Frontend static site deployed
- [ ] Database schema migrated
- [ ] API endpoints tested (Postman/Thunder Client)
- [ ] Frontend can reach backend
- [ ] User registration works
- [ ] Login/logout works
- [ ] League creation works
- [ ] Squad selection works
- [ ] SSL certificate active (https://)

---

## 🎉 GO LIVE!

Once deployed, your URLs will be:
- **Backend API**: `https://fantasy-cricket-backend.onrender.com`
- **Frontend App**: `https://fantasy-cricket-frontend.onrender.com`

Share with your users! 🏏

---

## 📞 NEXT STEPS AFTER DEPLOYMENT

1. **Custom Domain** (Optional):
   - Buy domain from Namecheap/GoDaddy ($10-15/year)
   - Point to Render in DNS settings
   - Add to Render dashboard

2. **Analytics**:
   - Add Google Analytics
   - Monitor user behavior
   - Track league creation

3. **Performance**:
   - Upgrade to paid tier if traffic grows
   - Add Redis caching (Upstash free tier)
   - Optimize database queries

4. **Backups**:
   - Render Free DB: 90-day retention
   - Export DB weekly: `pg_dump`
   - Store backups in Google Drive

---

## 💡 PRO TIPS

1. **Keep Repo Updated**: Every push to `main` auto-deploys
2. **Use Environment Variables**: Never hardcode secrets
3. **Monitor Free Tier Limits**: Check Render dashboard monthly
4. **Database Backups**: Export data regularly
5. **Add Loading States**: Handle 50s cold starts gracefully

---

**Ready to deploy? Let's start with Phase 1! 🚀**
