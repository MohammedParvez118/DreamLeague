# Email Configuration Guide for CricFantasy

## Overview
The authentication system sends verification emails when users register and password reset emails when requested. This guide will help you configure email functionality.

## Email Services Supported

### 1. Gmail (Recommended for Development)

#### Steps to Configure Gmail:

1. **Enable 2-Factor Authentication**
   - Go to your Google Account settings
   - Navigate to Security → 2-Step Verification
   - Enable it if not already enabled

2. **Generate App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other (Custom name)" → Enter "CricFantasy"
   - Click "Generate"
   - Copy the 16-character password (remove spaces)

3. **Update .env file**
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password
   FRONTEND_URL=http://localhost:5173
   ```

### 2. Other Email Services

#### Outlook/Hotmail
```javascript
service: 'hotmail'
```

#### Yahoo
```javascript
service: 'yahoo'
```

#### Custom SMTP Server
```javascript
host: 'smtp.yourprovider.com',
port: 587,
secure: false, // true for 465, false for other ports
auth: {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASSWORD
}
```

## Environment Variables Required

Create or update your `.env` file with these variables:

```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173

# JWT Secret (for authentication tokens)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## Testing Email Functionality

### 1. Development Testing (Without Real Emails)

For testing without sending real emails, you can:

1. **Use Ethereal Email** (fake SMTP service)
   ```javascript
   const testAccount = await nodemailer.createTestAccount();
   const transporter = nodemailer.createTransporter({
     host: 'smtp.ethereal.email',
     port: 587,
     auth: {
       user: testAccount.user,
       pass: testAccount.pass
     }
   });
   ```

2. **Manually Verify Users in Database**
   ```sql
   UPDATE users SET is_verified = true WHERE email = 'test@example.com';
   ```

### 2. Production Testing

1. Register a new account
2. Check your email inbox
3. Click the verification link
4. You should be redirected to the login page with a success message

## Email Templates

### Verification Email
- **Subject**: 🏏 Welcome to CricFantasy - Verify Your Email
- **Contains**: 
  - Welcome message
  - Verification button/link
  - 24-hour expiry notice

### Password Reset Email
- **Subject**: 🔑 Reset Your CricFantasy Password
- **Contains**:
  - Reset button/link
  - 1-hour expiry notice
  - Security warning

## Troubleshooting

### Common Issues

1. **"Invalid login" error**
   - Make sure you're using an App Password, not your regular Gmail password
   - Check that 2FA is enabled

2. **"Connection refused" error**
   - Check your firewall settings
   - Verify the SMTP port (587 for TLS, 465 for SSL)

3. **Emails not being received**
   - Check spam/junk folder
   - Verify EMAIL_USER is correct
   - Check email service rate limits

4. **Token expired error**
   - Verification tokens expire after 24 hours
   - Password reset tokens expire after 1 hour
   - User must request a new link

### Manual User Verification (for Development)

If you want to skip email verification during development:

```sql
-- Connect to your database
psql -U postgres -d fantasy_cricket

-- Verify a specific user
UPDATE users 
SET is_verified = true, 
    verification_token = NULL, 
    token_expiry = NULL 
WHERE email = 'your-test-email@example.com';
```

## Security Best Practices

1. **Never commit .env file** - Add it to .gitignore
2. **Use environment variables** - Don't hardcode credentials
3. **Use App Passwords** - Don't use your main email password
4. **Rotate secrets regularly** - Change JWT_SECRET periodically
5. **Use HTTPS in production** - Always use secure connections

## Email Flow

### Registration Flow:
1. User fills registration form
2. Server creates user account (unverified)
3. Server generates unique verification token
4. Server sends verification email
5. User clicks link in email
6. Server verifies token and marks account as verified
7. User is redirected to login page

### Password Reset Flow:
1. User requests password reset
2. Server generates reset token
3. Server sends reset email
4. User clicks link in email
5. User enters new password
6. Server validates token and updates password
7. User can login with new password

## Production Deployment

For production, consider using:
- **SendGrid** - High deliverability, free tier available
- **AWS SES** - Cost-effective for high volume
- **Mailgun** - Developer-friendly API
- **Postmark** - Excellent delivery rates

## Contact

For issues or questions about email configuration:
- Check the logs: `npm start` and look for email-related console messages
- Verify database: Check if user records have correct email addresses
- Test SMTP: Use a tool like https://www.smtper.net/ to test your SMTP settings
