// src/controllers/api/authApiController.js
import { db } from '../../config/database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = '7d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Email transporter (configure with your email service)
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // or your email service
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
  });
};

// Register new user
export const register = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Check if user already exists
    const existingUser = await db.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists with this email or username' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Check if email is configured
    const emailConfigured = process.env.EMAIL_USER && 
                           process.env.EMAIL_PASSWORD && 
                           process.env.EMAIL_USER !== 'your-email@gmail.com';
    
    // Check if in developer mode
    const devMode = process.env.DEV_MODE === 'true';
    
    // Auto-verify if email is not configured OR if in developer mode
    const isVerified = !emailConfigured || devMode;

    // Insert user
    const result = await db.query(
      `INSERT INTO users (username, email, password, verification_token, token_expiry, is_verified, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, username, email, is_verified, created_at`,
      [username, email, hashedPassword, verificationToken, tokenExpiry, isVerified]
    );

    const newUser = result.rows[0];

    // Send verification email (only if email is configured)
    if (emailConfigured) {
      try {
        const transporter = createEmailTransporter();
        const verificationLink = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;

        await transporter.sendMail({
        from: `"CricFantasy" <${process.env.EMAIL_USER || 'your-email@gmail.com'}>`,
        to: email,
        subject: '🏏 Welcome to CricFantasy - Verify Your Email',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Arial', sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; color: white; font-size: 36px; font-weight: 900; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">
                          🏏 CricFantasy
                        </h1>
                        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                          Your Fantasy Cricket Universe
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="color: #333; font-size: 24px; margin: 0 0 20px 0;">
                          Welcome aboard, ${username}! 👋
                        </h2>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                          Thank you for joining <strong>CricFantasy</strong>! We're excited to have you as part of our cricket fantasy community.
                        </p>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                          To get started and access all features, please verify your email address by clicking the button below:
                        </p>
                        
                        <!-- Verification Button -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 20px 0;">
                              <a href="${verificationLink}" 
                                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                        color: white;
                                        padding: 18px 50px;
                                        text-decoration: none;
                                        border-radius: 50px;
                                        font-size: 18px;
                                        font-weight: 700;
                                        display: inline-block;
                                        box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
                                        text-transform: uppercase;
                                        letter-spacing: 1px;">
                                ✉️ Verify Email Address
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 25px 0 15px 0; text-align: center;">
                          Or copy and paste this link in your browser:
                        </p>
                        
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 0 0 20px 0;">
                          <p style="margin: 0; word-break: break-all; color: #667eea; font-size: 14px; text-align: center;">
                            ${verificationLink}
                          </p>
                        </div>
                        
                        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                          <p style="margin: 0; color: #856404; font-size: 14px;">
                            ⏰ <strong>Important:</strong> This verification link will expire in 24 hours.
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                        <p style="margin: 0 0 10px 0; color: #999; font-size: 13px;">
                          If you didn't create this account, please ignore this email.
                        </p>
                        <p style="margin: 0; color: #999; font-size: 13px;">
                          © 2025 CricFantasy. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      });

        console.log('Verification email sent to:', email);
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
        // Continue anyway - user is created
      }
    }

    // Prepare response message
    const message = emailConfigured 
      ? 'Registration successful. Please check your email to verify your account.'
      : 'Registration successful! You can now log in immediately.';

    res.status(201).json({
      success: true,
      message,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        isVerified: newUser.is_verified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Verify email
export const verifyEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  try {
    const result = await db.query(
      `SELECT * FROM users 
       WHERE verification_token = $1 
       AND token_expiry > NOW()
       AND is_verified = false`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Update user as verified
    await db.query(
      `UPDATE users 
       SET is_verified = true, 
           verification_token = NULL, 
           token_expiry = NULL 
       WHERE verification_token = $1`,
      [token]
    );

    res.json({
      success: true,
      message: 'Email verified successfully! You can now log in.'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// Login
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if email is verified (skip in developer mode)
    const devMode = process.env.DEV_MODE === 'true';
    
    if (!devMode && !user.is_verified) {
      return res.status(403).json({ 
        error: 'Please verify your email before logging in. Check your inbox for the verification link.' 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Update last login
    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isVerified: user.is_verified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Forgot password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      // Don't reveal if email exists or not
      return res.json({
        success: true,
        message: 'If that email exists, a password reset link has been sent.'
      });
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await db.query(
      'UPDATE users SET verification_token = $1, token_expiry = $2 WHERE id = $3',
      [resetToken, tokenExpiry, user.id]
    );

    // Send reset email
    try {
      const transporter = createEmailTransporter();
      const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

      await transporter.sendMail({
        from: `"CricFantasy" <${process.env.EMAIL_USER || 'your-email@gmail.com'}>`,
        to: email,
        subject: '🔑 Reset Your CricFantasy Password',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Arial', sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; color: white; font-size: 36px; font-weight: 900; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">
                          🏏 CricFantasy
                        </h1>
                        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                          Password Reset Request
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="color: #333; font-size: 24px; margin: 0 0 20px 0;">
                          Hi ${user.username}, 👋
                        </h2>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                          We received a request to reset your password for your CricFantasy account.
                        </p>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                          Click the button below to create a new password:
                        </p>
                        
                        <!-- Reset Button -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 20px 0;">
                              <a href="${resetLink}" 
                                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                        color: white;
                                        padding: 18px 50px;
                                        text-decoration: none;
                                        border-radius: 50px;
                                        font-size: 18px;
                                        font-weight: 700;
                                        display: inline-block;
                                        box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
                                        text-transform: uppercase;
                                        letter-spacing: 1px;">
                                🔑 Reset Password
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 25px 0 15px 0; text-align: center;">
                          Or copy and paste this link in your browser:
                        </p>
                        
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 0 0 20px 0;">
                          <p style="margin: 0; word-break: break-all; color: #667eea; font-size: 14px; text-align: center;">
                            ${resetLink}
                          </p>
                        </div>
                        
                        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                          <p style="margin: 0; color: #856404; font-size: 14px;">
                            ⏰ <strong>Important:</strong> This reset link will expire in 1 hour.
                          </p>
                        </div>
                        
                        <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px;">
                          <p style="margin: 0; color: #721c24; font-size: 14px;">
                            ⚠️ <strong>Security Note:</strong> If you didn't request this password reset, please ignore this email or contact our support team immediately.
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                        <p style="margin: 0 0 10px 0; color: #999; font-size: 13px;">
                          This is an automated email from CricFantasy.
                        </p>
                        <p style="margin: 0; color: #999; font-size: 13px;">
                          © 2025 CricFantasy. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      });

      console.log('Password reset email sent to:', email);
    } catch (emailError) {
      console.error('Error sending reset email:', emailError);
    }

    res.json({
      success: true,
      message: 'If that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset' });
  }
};

// Logout
export const logout = async (req, res) => {
  // For JWT, logout is typically handled client-side by removing the token
  // But we can add any server-side cleanup here if needed
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};
