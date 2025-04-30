// server.js - Debug version with extensive error logging
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'your_jwt_secret'; // In production, use environment variables

// Enhanced logging
const logError = (location, error) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [ERROR] [${location}] ${error.message}\n${error.stack}\n`;
  
  console.error(logMessage);
  
  // Also log to file for persistence
  fs.appendFileSync(path.join(__dirname, 'server-error.log'), logMessage);
  
  return error;
};

// Middleware for logging all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const dbConfig = {
  host: 'localhost',
  user: 'root',     // Replace with your MySQL username
  password: 'Rahgul@2006',     // Replace with your MySQL password
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create database if it doesn't exist and then use it
const setupDatabase = async () => {
  try {
    // First connect without specifying a database
    const tempPool = mysql.createPool({
      ...dbConfig,
      database: undefined
    });
    
    console.log('Attempting to create database if it doesn\'t exist...');
    
    // Create the database if it doesn't exist
    await tempPool.query('CREATE DATABASE IF NOT EXISTS elearning_db');
    console.log('Database ensured.');
    
    // Close the temporary connection
    await tempPool.end();
    
    // Now create the real pool with the database specified
    const pool = mysql.createPool({
      ...dbConfig,
      database: 'elearning_db'
    });
    
    // Initialize tables
    console.log('Creating tables if they don\'t exist...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tables initialized successfully.');
    
    // Test connection
    const connection = await pool.getConnection();
    console.log('Database connection successful!');
    connection.release();
    
    return pool;
  } catch (error) {
    throw logError('Database Setup', error);
  }
};

// Wait for database setup before proceeding
let pool;
(async () => {
  try {
    pool = await setupDatabase();
  } catch (error) {
    console.error('Failed to setup database. Server will not function correctly:', error);
    process.exit(1); // Exit if we can't set up the database
  }
})();

// User Model Methods
const User = {
  async findByEmail(email) {
    try {
      console.log(`Looking up user with email: ${email}`);
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      console.log(`Found ${rows.length} users with email ${email}`);
      return rows[0];
    } catch (error) {
      throw logError('findByEmail', error);
    }
  },

  async create(userData) {
    const { username, email, password } = userData;
    
    console.log(`Creating new user: ${username}, ${email}`);
    
    try {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      console.log('Password hashed successfully');
      
      const [result] = await pool.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword]
      );
      
      console.log(`User created with ID: ${result.insertId}`);
      return result.insertId;
    } catch (error) {
      // Log the specific MySQL error code
      console.error(`MySQL Error Code: ${error.code}`);
      
      // If error is a duplicate entry error (code 1062), give a friendlier message
      if (error.code === 'ER_DUP_ENTRY') {
        const customError = new Error('User already exists with this email');
        customError.statusCode = 400;
        throw logError('create - duplicate entry', customError);
      }
      
      throw logError('create', error);
    }
  },
  
  async validatePassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      throw logError('validatePassword', error);
    }
  }
};

// Register route
app.post('/api/auth/register', async (req, res) => {
  console.log('Registration attempt:', req.body);
  
  try {
    const { username, email, password } = req.body;
    
    // Validate request body
    if (!username || !email || !password) {
      console.log('Missing required fields');
      return res.status(400).json({ message: 'Please provide username, email and password' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Invalid email format');
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }
    
    // Validate password strength
    if (password.length < 6) {
      console.log('Password too short');
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    // Check if user already exists
    console.log('Checking if user exists...');
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      console.log('User already exists');
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    // Create new user
    console.log('Creating new user...');
    const userId = await User.create({ username, email, password });
    
    // Generate JWT token
    console.log('Generating token...');
    const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
    
    console.log('Registration successful');
    res.status(201).json({
      message: 'User registered successfully',
      token
    });
  } catch (error) {
    logError('Register route', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      message: error.message || 'Server error during registration',
      errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Login route
app.post('/api/auth/login', async (req, res) => {
  console.log('Login attempt:', { email: req.body.email });
  
  try {
    const { email, password } = req.body;
    
    // Validate request body
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ message: 'Please provide email and password' });
    }
    
    // Find user by email
    console.log('Finding user...');
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('User not found');
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Validate password
    console.log('Validating password...');
    const isMatch = await User.validatePassword(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch');
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    console.log('Generating token...');
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
    
    console.log('Login successful');
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    logError('Login route', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Protected route example
app.get('/api/auth/user', async (req, res) => {
  console.log('Auth check attempt');
  
  try {
    const token = req.header('x-auth-token');
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Verify token
    console.log('Verifying token...');
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user info from database
    console.log('Getting user data...');
    const [rows] = await pool.query('SELECT id, username, email FROM users WHERE id = ?', [decoded.id]);
    const user = rows[0];
    
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('Auth check successful');
    res.json(user);
  } catch (error) {
    logError('Auth route', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Simple test route
app.get('/', (req, res) => {
  res.send('E-Learning API is running');
});

// Global error handler
app.use((err, req, res, next) => {
  logError('Global handler', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});