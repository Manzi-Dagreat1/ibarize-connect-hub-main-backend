require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { connectDB, getGridFSBucket, getDatabase } = require('./database');
const { ObjectId } = require('mongodb');

const app = express();

// CORS configuration (allow specific origins via env)
const normalizeOrigin = (u) => (u ? u.replace(/\/$/, '') : u);
const allowedOriginsRaw = process.env.CORS_ORIGINS;
// const allowedOriginsRaw = process.env.CORS_ORIGINS || 'http://localhost:8080,http://localhost:3000';
const allowedOrigins = allowedOriginsRaw.split(',').map(o => normalizeOrigin(o.trim())).filter(Boolean);
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser tools
    const o = normalizeOrigin(origin);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(o)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure DB connected before handling requests (important for serverless)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    return next();
  } catch (e) {
    return next(e);
  }
});

// Ensure uploads directory exists (allow override via env) - kept for compatibility only
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (_) {}
}

// Static route for uploads kept for compatibility (no-op when using GridFS)
app.use('/uploads', express.static(uploadsDir));

// Multer configuration: keep files in memory, then persist to MongoDB GridFS
const storage = multer.memoryStorage();
// Note: Vercel Serverless Functions have a ~4.5MB body limit. Keep below that or switch to direct-to-cloud uploads.
const upload = multer({ storage });

// File upload endpoint with restrictions
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|wmv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) return cb(null, true);
  cb(new Error('Only images and videos are allowed!'));
};

const uploadWithLimits = multer({
  storage,
  // Keep at or below ~4MB for Vercel serverless; adjust if using another host
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter,
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

// Properties API
app.get('/api/properties', async (req, res) => {
  try {
    const db = getDatabase();
    const properties = await db.collection('properties').find().sort({ createdAt: -1 }).toArray();
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/properties/:id', async (req, res) => {
  try {
    const db = getDatabase();
    let property = await db.collection('properties').findOne({ id: req.params.id });
    if (!property) {
      try { 
        property = await db.collection('properties').findOne({ _id: new ObjectId(req.params.id) }); 
      } catch (e) {}
    }
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json(property);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/properties', async (req, res) => {
  try {
    const {
      title, price, location, bedrooms, bathrooms, size, type, description,
      images, videos, amenities, featured, status, virtualTour, yearBuilt,
      parking, floor, furnished, petFriendly, garden, balcony, securitySystem,
      nearbyFacilities
    } = req.body;

    const id = require('uuid').v4();
    const db = getDatabase();

    const propertyDoc = {
      id,
      title,
      price,
      location,
      bedrooms: bedrooms || 1,
      bathrooms: bathrooms || 1,
      size,
      type: type || 'apartment',
      description,
      images: images || [],
      videos: videos || [],
      amenities: amenities || [],
      featured: !!featured,
      status: status || 'active',
      virtualTour,
      yearBuilt,
      parking: parking || 0,
      floor: floor || 1,
      furnished: !!furnished,
      petFriendly: !!petFriendly,
      garden: !!garden,
      balcony: !!balcony,
      securitySystem: !!securitySystem,
      nearbyFacilities: nearbyFacilities || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('properties').insertOne(propertyDoc);

    res.status(201).json({ id: id, message: 'Property created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/properties/:id', async (req, res) => {
  try {
    const {
      title, price, location, bedrooms, bathrooms, size, type, description,
      images, videos, amenities, featured, status, virtualTour, yearBuilt,
      parking, floor, furnished, petFriendly, garden, balcony, securitySystem,
      nearbyFacilities
    } = req.body;

    const db = getDatabase();
    
    await db.collection('properties').updateOne(
      { id: req.params.id },
      {
        $set: {
          title,
          price,
          location,
          bedrooms: bedrooms || 1,
          bathrooms: bathrooms || 1,
          size,
          type: type || 'apartment',
          description,
          images: images || [],
          videos: videos || [],
          amenities: amenities || [],
          featured: !!featured,
          status: status || 'active',
          virtualTour,
          yearBuilt,
          parking: parking || 0,
          floor: floor || 1,
          furnished: !!furnished,
          petFriendly: !!petFriendly,
          garden: !!garden,
          balcony: !!balcony,
          securitySystem: !!securitySystem,
          nearbyFacilities: nearbyFacilities || [],
          updatedAt: new Date(),
        }
      }
    );

    res.json({ message: 'Property updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/properties/:id', async (req, res) => {
  try {
    const db = getDatabase();
    await db.collection('properties').deleteOne({ id: req.params.id });
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload to GridFS
app.post('/api/upload', uploadWithLimits.array('files'), async (req, res) => {
  try {
    const uploadedFiles = [];

    const bucket = getGridFSBucket();
    for (const file of req.files) {
      const originalName = file.originalname || `${uuidv4()}${path.extname(file.originalname || '')}`;

      const gridId = await new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(originalName, { contentType: file.mimetype });
        uploadStream.on('error', reject);
        uploadStream.on('finish', () => resolve(uploadStream.id));
        uploadStream.end(file.buffer);
      });

      const db = getDatabase();
      const mediaDoc = {
        filename: originalName,
        url: `/api/files/${gridId.toString()}`,
        mimetype: file.mimetype,
        size: file.size,
        gridFsId: gridId,
        uploadedAt: new Date()
      };

      const result = await db.collection('media').insertOne(mediaDoc);

      uploadedFiles.push({
        id: result.insertedId,
        filename: originalName,
        url: `/api/files/${gridId.toString()}`,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: mediaDoc.uploadedAt
      });
    }

    res.json({ files: uploadedFiles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stream file from GridFS
app.get('/api/files/:gridId', async (req, res) => {
  try {
    const gridId = req.params.gridId;
    const bucket = getGridFSBucket();

    const db = getDatabase();
    const mediaDoc = await db.collection('media').findOne({ gridFsId: gridId }) || null;
    if (mediaDoc?.mimetype) {
      res.setHeader('Content-Type', mediaDoc.mimetype);
    }

    const { ObjectId } = require('mongodb');
    const downloadStream = bucket.openDownloadStream(new ObjectId(gridId));
    downloadStream.on('error', (err) => {
      return res.status(404).json({ error: 'File not found' });
    });
    downloadStream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics API
app.get('/api/analytics', async (req, res) => {
  try {
    const db = getDatabase();
    const totalProperties = await db.collection('properties').countDocuments();

    // Compute average price; fallback to 0 if none
    const avgAgg = await db.collection('properties').aggregate([
      { $group: { _id: null, avgPrice: { $avg: '$price' } } }
    ]).toArray();
    const averagePrice = avgAgg?.[0]?.avgPrice ? Math.round(avgAgg[0].avgPrice) : 0;

    // These metrics are not currently tracked; return sensible defaults
    const totalViews = 0;
    const totalLeads = 0;

    // Extra fields used by Dashboard UI
    const totalContacts = 0;
    const conversionRate = '0%';
    const avgResponseTime = '0h';

    res.json({
      totalProperties,
      totalViews,
      totalLeads,
      averagePrice,
      totalContacts,
      conversionRate,
      avgResponseTime,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User settings API
app.get('/api/user', async (req, res) => {
  try {
    const db = getDatabase();
    let user = await db.collection('users').findOne({ id: '1' });
    if (!user) {
      const newUser = {
        id: '1',
        name: 'IBARIZE REAL ESTATE',
        email: 'broker@ibarize.com',
        phone: '+250 780 429 006',
        location: 'KICUKIRO CENTER - Behind Bank BPR',
        bio: '',
        theme: 'light',
        language: 'en',
        currency: 'rwf',
        notifications: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('users').insertOne(newUser);
      user = newUser;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/user', async (req, res) => {
  try {
    const { name, email, phone, location, bio, theme, language, currency, notifications } = req.body;

    const db = getDatabase();
    await db.collection('users').updateOne(
      { id: '1' },
      {
        $set: {
          name,
          email,
          phone,
          location,
          bio,
          theme: theme || 'light',
          language: language || 'en',
          currency: currency || 'rwf',
          notifications: notifications || {},
          updatedAt: new Date(),
        }
      },
      { upsert: true }
    );
    res.json({ message: 'User settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings API (alias of updating the single user record)
app.put('/api/settings', async (req, res) => {
  try {
    const { name, email, phone, location, bio, theme, language, currency, notifications } = req.body;

    const db = getDatabase();
    await db.collection('users').updateOne(
      { id: '1' },
      {
        $set: {
          name,
          email,
          phone,
          location,
          bio,
          theme: theme || 'light',
          language: language || 'en',
          currency: currency || 'rwf',
          notifications: notifications || {},
          updatedAt: new Date(),
        }
      },
      { upsert: true }
    );

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
