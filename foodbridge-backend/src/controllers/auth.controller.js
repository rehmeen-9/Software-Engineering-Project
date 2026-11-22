
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Password must contain at least 8 characters,
// one lowercase letter, one uppercase letter and one number.
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// Basic email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// REGISTER
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    // Check required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: 'name, email, password and role are required'
      });
    }

    // Validate email
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        message: 'Invalid email format'
      });
    }

    // Validate password
    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number'
      });
    }

    // Admins cannot self-register
    if (!['vendor', 'recipient'].includes(role)) {
      return res.status(400).json({
        message: 'Role must be vendor or recipient'
      });
    }

    // Check if email already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: 'Email is already registered'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new user into database
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone, address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, phone, address, created_at`,
      [
        name,
        email.toLowerCase(),
        passwordHash,
        role,
        phone || null,
        address || null
      ]
    );

    const user = result.rows[0];

    // Generate JWT token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d'
      }
    );

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user
    });

  } catch (err) {
    console.error('Registration error:', err);

    if (err.code === '23505') {
      return res.status(409).json({
        message: 'Email is already registered'
      });
    }

    return res.status(500).json({
      message: 'Server error'
    });
  }
};


// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    const user = result.rows[0];

    // Check email and password
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d'
      }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Login error:', err);

    return res.status(500).json({
      message: 'Server error'
    });
  }
};


// LOGOUT
exports.logout = (req, res) => {
  // JWT is stateless, so the frontend removes the token.
  res.json({
    message: 'Logged out successfully'
  });
};
