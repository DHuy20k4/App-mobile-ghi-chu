import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mssql from 'mssql';
import { getPool } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: 'Username and password are required' });
      return;
    }

    const pool = await getPool();

    // Kiểm tra trùng username
    const existing = await pool
      .request()
      .input('username', mssql.VarChar, username.trim())
      .query('SELECT Id FROM Users WHERE Username = @username');

    if (existing.recordset.length > 0) {
      res.status(409).json({ message: 'Username already exists' });
      return;
    }

    // Băm mật khẩu bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await pool
      .request()
      .input('username', mssql.VarChar, username.trim())
      .input('passwordHash', mssql.VarChar, passwordHash)
      .query(`
        INSERT INTO Users (Username, PasswordHash) 
        OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.CreatedAt
        VALUES (@username, @passwordHash)
      `);

    const user = result.recordset[0];
    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.Id, username: user.Username, createdAt: user.CreatedAt },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: 'Username and password are required' });
      return;
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input('username', mssql.VarChar, username.trim())
      .query('SELECT * FROM Users WHERE Username = @username');

    if (result.recordset.length === 0) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const user = result.recordset[0];
    const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);

    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Tạo Access Token (15p) & Refresh Token (7d)
    const payload = { userId: user.Id, username: user.Username };
    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: { id: user.Id, username: user.Username },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ message: 'Refresh token required' });
      return;
    }

    jwt.verify(refreshToken, REFRESH_SECRET, (err: any, decoded: any) => {
      if (err) {
        res.status(403).json({ message: 'Invalid or expired refresh token' });
        return;
      }

      const payload = { userId: decoded.userId, username: decoded.username };
      const newAccessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });

      res.json({ accessToken: newAccessToken });
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const me = async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({ user: req.user });
};
