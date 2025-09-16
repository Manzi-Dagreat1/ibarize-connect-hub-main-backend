const { MongoClient, ServerApiVersion, GridFSBucket } = require('mongodb');
const path = require('path');

// Feature flag: enable SQLite only if explicitly requested
const USE_SQLITE = process.env.USE_SQLITE === 'true';
let sqlite3, db, dbPath;
if (USE_SQLITE) {
  sqlite3 = require('sqlite3').verbose();
}

// MongoDB connection
const sanitizeUriForLog = (uri) => {
  try {
    const u = new URL(uri);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '[invalid uri]';
  }
};

// Global MongoDB client instance
let mongoClient = null;
let database = null;

const connectDB = async () => {
  try {
    // Use the new MongoDB connection string
    const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://manzinshutiigor_db_user:p31edgG6eV6fBgiE@ibarize.nep9l04.mongodb.net/ibarize_connect_hub?retryWrites=true&w=majority&appName=ibarize";
    console.log('Connecting to MongoDB:', sanitizeUriForLog(MONGO_URI));

    // Create MongoClient with Stable API version
    mongoClient = new MongoClient(MONGO_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    // Connect the client to the server
    await mongoClient.connect();
    
    // Get database instance
    database = mongoClient.db('ibarize_connect_hub');
    
    // Send a ping to confirm a successful connection
    await mongoClient.db("admin").command({ ping: 1 });
    console.log("✅ Pinged your deployment. You successfully connected to MongoDB!");

    return mongoClient;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    console.error('Full error:', error);
    throw error;
  }
};

// Get the native MongoDB client
const getMongoClient = () => {
  if (!mongoClient) {
    throw new Error('MongoDB client not initialized. Call connectDB() first.');
  }
  return mongoClient;
};

// Get the database instance
const getDatabase = (dbName = 'ibarize_connect_hub') => {
  if (!mongoClient) {
    throw new Error('MongoDB client not initialized. Call connectDB() first.');
  }
  return mongoClient.db(dbName);
};

// Helper to get a GridFS bucket
const getGridFSBucket = (dbName = 'ibarize_connect_hub') => {
  const db = getDatabase(dbName);
  return new GridFSBucket(db);
};

// SQLite setup for properties
if (USE_SQLITE) {
  dbPath = process.env.SQLITE_PATH || path.join(__dirname, 'ibarize.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to SQLite database.');
    }
  });
}

// Initialize tables
const initDatabase = () => {
  if (!USE_SQLITE) {
    console.log('SQLite disabled (USE_SQLITE is not true) — skipping SQLite initialization.');
    return;
  }
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

  console.log('SQLite database initialized successfully.');
};

// Helper functions
const runQuery = (query, params = []) => {
  if (!USE_SQLITE) throw new Error('SQLite disabled');
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
  if (!USE_SQLITE) throw new Error('SQLite disabled');
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
  if (!USE_SQLITE) throw new Error('SQLite disabled');
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
  allQuery,
  getGridFSBucket,
  getMongoClient,
  getDatabase,
};