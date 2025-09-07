const mongoose = require('mongoose');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// MongoDB connection
const connectDB = async () => {
  try {
    // const conn = await mongoose.connect('mongodb://localhost:27017/ibarize-media');
    const conn = await mongoose.connect('mongodb+srv://dickson:Dickson12@cluster0.v6ds6mf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

// SQLite setup for properties
const dbPath = path.join(__dirname, 'ibarize.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Initialize tables
const initDatabase = () => {
  // Properties table
  db.run(`
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      price TEXT NOT NULL,
      location TEXT NOT NULL,
      bedrooms INTEGER DEFAULT 1,
      bathrooms INTEGER DEFAULT 1,
      size TEXT,
      type TEXT DEFAULT 'apartment',
      description TEXT,
      images TEXT,
      videos TEXT,
      amenities TEXT,
      featured BOOLEAN DEFAULT 0,
      status TEXT DEFAULT 'active',
      virtualTour TEXT,
      yearBuilt INTEGER,
      parking INTEGER DEFAULT 0,
      floor INTEGER DEFAULT 1,
      furnished BOOLEAN DEFAULT 0,
      petFriendly BOOLEAN DEFAULT 0,
      garden BOOLEAN DEFAULT 0,
      balcony BOOLEAN DEFAULT 0,
      securitySystem BOOLEAN DEFAULT 0,
      nearbyFacilities TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `);

  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      phone TEXT,
      location TEXT,
      bio TEXT,
      theme TEXT DEFAULT 'light',
      language TEXT DEFAULT 'en',
      currency TEXT DEFAULT 'rwf',
      notifications TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `);

  // Insert default user
  db.get("SELECT id FROM users WHERE id = '1'", (err, row) => {
    if (!row) {
      db.run(`
        INSERT INTO users (id, name, email, phone, location, bio, createdAt, updatedAt)
        VALUES ('1', 'IBARIZE REAL ESTATE', 'broker@ibarize.com', '+250 780 429 006', 'KICUKIRO CENTER - Behind Bank BPR', '', datetime('now'), datetime('now'))
      `);
    } else {
      // Ensure default user's currency is RWF
      db.run(`UPDATE users SET currency = 'rwf' WHERE id = '1' AND (currency IS NULL OR LOWER(currency) = 'usd')`);
    }
  });

  console.log('Database initialized successfully.');
};

// Helper functions
const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

const getQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const allQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

module.exports = {
  connectDB,
  initDatabase,
  runQuery,
  getQuery,
  allQuery
};
