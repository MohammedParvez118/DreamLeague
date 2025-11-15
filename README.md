Generated on: 2025-11-02
# 🏏 Fantasy Cricket App

A modern fantasy cricket league management application built with React, Express, and PostgreSQL.

## 🎯 Overview

Create and manage fantasy cricket leagues with your friends! Select players, track performance, compete for points, and climb the leaderboard.

### Key Features
- 🔐 **User Authentication** - Secure email/password with verification
- 🏆 **Tournament Management** - Add cricket tournaments from RapidAPI
- 🎮 **League System** - Create public/private leagues
- 👥 **Team Builder** - Select your dream team of 11 players
- 📊 **Live Tracking** - Real-time scores and rankings
- 🗑️ **Smart Deletion** - Date-based validation for leagues/tournaments

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- RapidAPI account (optional - use DEV_MODE for testing)

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd Fantasy-app

# Install dependencies
npm install
cd client && npm install && cd ..

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Setup database
createdb Fantasy
psql -d Fantasy -f migrations/create_users_table.sql
psql -d Fantasy -f migrations/add_tournament_dates.sql
psql -d Fantasy -f migrations/add_league_created_by.sql
psql -d Fantasy -f migrations/create-test-users.sql

# Start development (choose one)

# Option 1: Use helper scripts
# Windows:
scripts/dev/start-dev.bat
# Linux/Mac:
./scripts/dev/start-dev.sh

# Option 2: Manual (two terminals)
# Terminal 1:
npm start
# Terminal 2:
cd client && npm run dev
```

**Access:** http://localhost:5173

**Test Login:** `test1@example.com` / `Test123!`

---

## 📁 Project Structure

```
Fantasy-app/
├── client/                     # React Frontend (Vite)
│   ├── src/
│   │   ├── pages/             # Page components
│   │   │   ├── fantasy/       # League creation, team setup
│   │   │   ├── league/        # League details, rankings
│   │   │   └── tournament/    # Tournament pages
│   │   ├── layouts/           # Layout wrappers
│   │   ├── services/          # API client
│   │   └── components/        # Reusable components
│   └── vite.config.js
│
├── src/                       # Express Backend
│   ├── config/
│   │   └── database.js        # PostgreSQL pool
│   ├── controllers/api/       # Route handlers
│   │   ├── authApiController.js
│   │   ├── homeApiController.js
│   │   ├── fantasyApiController.js
│   │   ├── leagueApiController.js
│   │   └── tournamentApiController.js
│   ├── routes/api/
│   │   └── index.js           # Route definitions
│   ├── services/
│   │   └── apiService.js      # RapidAPI integration
│   ├── middleware/
│   │   └── errorHandler.js
│   └── utils/
│       └── helpers.js
│
├── migrations/                # Database migrations
│   ├── create_users_table.sql
│   ├── add_tournament_dates.sql
│   └── create-test-users.sql
│
├── scripts/                   # Utility scripts
│   ├── db/                    # Database utilities
│   └── dev/                   # Development helpers
│
├── docs/                      # Documentation
│   ├── FEATURES.md            # Complete feature guide
│   ├── DEVELOPMENT.md         # Dev setup & workflow
│   ├── AUTHENTICATION_GUIDE.md
│   └── EMAIL_CONFIGURATION.md
│
├── app.js                     # Backend entry point
├── .env.example               # Environment template
├── .gitignore                 # Git exclusions
├── CONTRIBUTING.md            # Contribution guide
└── README.md                  # This file
```

---

## 🎯 Features

### Authentication & Users
- ✅ Email/password registration
- ✅ Email verification
- ✅ Secure session management
- ✅ Password reset functionality

### Tournament Management
- ✅ Add tournaments from RapidAPI (Cricbuzz)
- ✅ Auto-fetch matches, squads, and fixtures
- ✅ Tournament dates tracking
- ✅ Delete completed tournaments
- ✅ DEV_MODE for offline testing

### Fantasy Leagues
- ✅ Create public/private leagues
- ✅ Join leagues with 6-digit code
- ✅ Auto-add creator as first team (optional)
- ✅ League status tracking (ongoing/completed)
- ✅ Delete completed leagues (creator-only)
- ✅ Browse public leagues

### Team Management
- ✅ Setup fantasy teams with custom names
- ✅ Select 11 players from tournament squads
- ✅ Role-based player selection
- ✅ Budget constraints
- ✅ View league rankings

### Smart Features
- 🎯 **Date Validation** - Can't delete ongoing tournaments/leagues
- � **Creator Permissions** - Only creators can delete their leagues
- 📊 **Status Badges** - Visual indicators for league status
- 🧪 **DEV Mode** - Test without API rate limits

---

## 🛠️ Tech Stack

**Frontend:**
- React 18.3 + Vite 6.4
- React Router 6
- Modern CSS (component-scoped)

**Backend:**
- Node.js + Express 5.1
- PostgreSQL 8.15
- Session-based authentication
- RESTful API

**External APIs:**
- RapidAPI (Cricbuzz Cricket API)

**DevOps:**
- Git version control
- Environment-based configuration
- Database migrations

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/verify-email` - Verify email
- `GET /api/auth/me` - Get current user

### Tournaments
- `GET /api/tournaments` - List tournaments
- `POST /api/tournament/add` - Add tournament
- `DELETE /api/tournament/:id` - Delete tournament
- `GET /api/tournament/:id/home` - Tournament details
- `GET /api/tournament/:id/fixtures` - Fixtures
- `GET /api/tournament/:id/squads` - Squads

### Leagues
- `POST /api/fantasy/create` - Create league
- `POST /api/league/join` - Join league
- `DELETE /api/league/:id` - Delete league
- `GET /api/leagues` - User's leagues
- `GET /api/leagues/public` - Browse public leagues
- `GET /api/league/:id/details` - League details

### Teams
- `POST /api/fantasy/setup-team` - Setup team
- `POST /api/fantasy/save-squad` - Save squad

**Full API documentation:** See [`docs/FEATURES.md`](./docs/FEATURES.md)

---

## � Development

### Enable DEV Mode (Recommended)

Avoid RapidAPI rate limits during development:

```bash
# .env
DEV_MODE=true
```

Or toggle in frontend: **Settings → Enable DEV Mode**

### Database Management

```bash
# Connect to database
psql -d Fantasy

# Check schema
node scripts/db/check-schema.js

# Update tournament dates
node scripts/db/update-tournament-dates.js

# Check structure
node scripts/db/check-db-structure.js
```

### Useful Commands

```bash
# Backend
npm start              # Start backend
npm run dev            # Start with nodemon (auto-reload)

# Frontend
cd client
npm run dev            # Start Vite dev server
npm run build          # Build for production

# Database
psql -d Fantasy -f migrations/your_migration.sql
```

**Detailed guide:** See [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md)

---

## 📝 Environment Variables

Create `.env` file in root:

```env
# Database
DB_USER=postgres
DB_HOST=localhost
DB_NAME=Fantasy
DB_PASSWORD=your_password
DB_PORT=5432

# Session
SESSION_SECRET=your_secret_key_change_this

# Email (Optional)
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

**See:** [`docs/EMAIL_CONFIGURATION.md`](./docs/EMAIL_CONFIGURATION.md) for email setup

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [`README.md`](./README.md) | This file - project overview |
| [`docs/FEATURES.md`](./docs/FEATURES.md) | **Complete feature guide** |
| [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md) | **Development workflow** |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | How to contribute |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System architecture |
| [`docs/AUTHENTICATION_GUIDE.md`](./docs/AUTHENTICATION_GUIDE.md) | Auth implementation |
| [`docs/EMAIL_CONFIGURATION.md`](./docs/EMAIL_CONFIGURATION.md) | Email setup guide |

---

## 🧪 Testing

### Test Users (Pre-created)

| Email | Password | Status |
|-------|----------|--------|
| test1@example.com | Test123! | ✅ Verified |
| test2@example.com | Test123! | ✅ Verified |
| creator@test.com | Test123! | ✅ Verified |

### Manual Testing

```bash
# Health check
curl http://localhost:3000/api/home

# Get tournaments
curl http://localhost:3000/api/tournaments

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@example.com","password":"Test123!"}'
```

---

## � Deployment

### Production Build

```bash
# Build frontend
cd client
npm run build

# Output: client/dist/

# Configure backend to serve static files
# (Already configured in app.js for production)
```

### Environment Setup
- Set `NODE_ENV=production`
- Set `DEV_MODE=false`
- Configure production database
- Set strong `SESSION_SECRET`
- Enable SSL/HTTPS

**Full deployment guide:** See [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md#deployment)

---

## 🤝 Contributing

We welcome contributions! Please see [`CONTRIBUTING.md`](./CONTRIBUTING.md) for:
- Development workflow
- Code style guidelines
- Pull request process
- Testing requirements

**Quick contribution steps:**
1. Fork the repository
2. Create feature branch (`feature/your-feature`)
3. Make changes and test thoroughly
4. Submit pull request

---

## 📄 License

ISC

---

## � Acknowledgments

- **RapidAPI** - Cricket data provider
- **React Team** - Amazing framework
- **PostgreSQL** - Reliable database

---

## � Support

- 📖 Read [`docs/FEATURES.md`](./docs/FEATURES.md) for feature help
- 🛠️ Check [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md) for setup issues
- 🔐 See [`docs/AUTHENTICATION_GUIDE.md`](./docs/AUTHENTICATION_GUIDE.md) for auth
- 📧 Check [`docs/EMAIL_CONFIGURATION.md`](./docs/EMAIL_CONFIGURATION.md) for email

---

**Made with ❤️ for cricket fans worldwide! �**

*Version: 2.3 (Post-cleanup) | Last Updated: October 19, 2025*
