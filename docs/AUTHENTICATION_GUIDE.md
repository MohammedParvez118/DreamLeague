# Authentication System - Quick Start Guide

## ✅ What's Been Implemented

### Pages Created:
- `/auth` - Login, Register, and Forgot Password
- `/verify-email?token=xxx` - Email verification handler

### API Endpoints:
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify-email?token=xxx` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/logout` - Logout user

### Database:
- `users` table created with all necessary fields
- Indexes added for email and verification_token

## 🚀 Quick Setup

### 1. Configure Email (Required for Verification)

Create or update `.env` file in the root directory:

```env
# Email Configuration (for Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# JWT Secret
JWT_SECRET=change-this-to-a-random-secret-key

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

**To get Gmail App Password:**
1. Enable 2-Factor Authentication in your Google Account
2. Go to https://myaccount.google.com/apppasswords
3. Generate app password for "Mail" → "Other (CricFantasy)"
4. Copy the 16-character password (no spaces)

### 2. Start the Servers

**Terminal 1 - Backend:**
```bash
cd "c:\Users\admin\Documents\Fantasy-app - Backup"
npm start
```

**Terminal 2 - Frontend:**
```bash
cd "c:\Users\admin\Documents\Fantasy-app - Backup\client"
npm run dev
```

### 3. Test the Flow

1. **Visit:** http://localhost:5173/
2. **Click:** "Get Started" button
3. **Register** a new account:
   - Username: testuser
   - Email: your-real-email@gmail.com
   - Password: password123
   - Confirm Password: password123
4. **Check your email** for verification link
5. **Click the link** in email → Auto-redirects to login
6. **Login** with your credentials
7. **Success!** You're authenticated

## 📧 Email Templates

### Verification Email
When a user registers, they receive:
- **Subject:** 🏏 Welcome to CricFantasy - Verify Your Email
- **Content:** Beautiful HTML email with verification button
- **Expiry:** 24 hours

### Password Reset Email
When a user requests password reset:
- **Subject:** 🔑 Reset Your CricFantasy Password
- **Content:** HTML email with reset button
- **Expiry:** 1 hour

## 🔒 Security Features

✅ **Password Hashing** - bcrypt with salt rounds
✅ **JWT Tokens** - Secure authentication tokens
✅ **Email Verification** - Users must verify before login
✅ **Token Expiry** - Verification links expire automatically
✅ **Input Validation** - Both client and server side
✅ **SQL Injection Protection** - Parameterized queries

## 🧪 Testing Without Email (Development)

If you don't want to configure email for testing:

### Option 1: Manual Database Verification
```sql
-- Connect to database
psql -U postgres -d fantasy_cricket

-- Verify user manually
UPDATE users 
SET is_verified = true 
WHERE email = 'test@example.com';
```

### Option 2: Comment Out Email Check
In `authApiController.js`, temporarily comment out:
```javascript
// if (!user.is_verified) {
//   return res.status(403).json({ 
//     error: 'Please verify your email before logging in.' 
//   });
// }
```

## 📱 User Flow

### Registration:
1. User visits `/auth` → Clicks "Register" tab
2. Fills form → Submits
3. Account created with `is_verified = false`
4. Verification email sent automatically
5. Success message shown
6. Auto-switches to login tab after 3 seconds

### Email Verification:
1. User clicks link in email
2. Browser opens `/verify-email?token=xxx`
3. Token validated on backend
4. Account marked as verified
5. Success animation shown
6. Auto-redirects to `/auth` after 3 seconds

### Login:
1. User enters email & password
2. System checks if email is verified
3. If verified: JWT token generated & stored
4. User redirected to `/home`
5. Token stored in localStorage

## 🎨 UI Features

- **Tabbed Interface** - Switch between Login/Register/Forgot
- **Real-time Validation** - Form errors shown immediately
- **Loading States** - Buttons show loading during API calls
- **Success/Error Messages** - Color-coded feedback
- **Smooth Animations** - Professional transitions
- **Responsive Design** - Works on all devices

## 🔧 Customization

### Change Token Expiry:
In `authApiController.js`:
```javascript
// Verification token (currently 24 hours)
const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

// Password reset (currently 1 hour)
const tokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000);
```

### Change JWT Expiry:
In `authApiController.js`:
```javascript
const JWT_EXPIRES_IN = '7d'; // Change to '24h', '30d', etc.
```

### Customize Email Templates:
Edit the HTML in `authApiController.js` → `sendMail()` sections

## 📊 Database Schema

```sql
users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  token_expiry TIMESTAMP,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## 🐛 Troubleshooting

**"Email not sending"**
- Check EMAIL_USER and EMAIL_PASSWORD in .env
- Verify App Password is correct (not regular Gmail password)
- Check spam folder

**"Invalid credentials"**
- Make sure email is verified (check database)
- Password must match exactly
- Check if user exists

**"Token expired"**
- Request new verification email
- Verification links expire after 24 hours

**"Cannot connect to database"**
- Check if PostgreSQL is running
- Verify database credentials in .env

## 📚 API Documentation

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Verify Email
```http
GET /api/auth/verify-email?token=abc123xyz
```

### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

## ✨ Next Steps

Consider adding:
- [ ] Password strength meter
- [ ] Social login (Google, Facebook)
- [ ] Two-factor authentication (2FA)
- [ ] Remember me functionality
- [ ] Session management
- [ ] User profile page
- [ ] Change password feature
- [ ] Email change with re-verification

## 📞 Support

For detailed email configuration, see: `docs/EMAIL_CONFIGURATION.md`

For any issues:
1. Check console logs (both frontend and backend)
2. Verify database tables exist
3. Check .env configuration
4. Review error messages carefully
