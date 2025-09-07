const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { connectDB, getGridFSBucket } = require('./database');
const Media = require('./models/Media');
const Property = require('./models/Property');
const User = require('./models/User');
const { Readable } = require('stream');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration (allow specific origins via env)
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser tools
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure uploads directory exists (allow override via env)
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Static route for uploads kept for compatibility (no-op when using GridFS)
app.use('/uploads', express.static(uploadsDir));

// Multer configuration: keep files in memory, then persist to MongoDB GridFS
const storage = multer.memoryStorage();
const upload = multer({ storage });

// File upload endpoint with restrictions
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|wmv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images and videos are allowed!'));
  }
};

const uploadWithLimits = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 }, fileFilter });

// Connect to MongoDB
connectDB();

// No SQLite initialization – using MongoDB for app data

// Routes

// Properties API
app.get('/api/properties', async (req, res) => {
  try {
    const properties = await Property.find().sort({ createdAt: -1 });
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/properties/:id', async (req, res) => {
  try {
    let property = await Property.findOne({ id: req.params.id });
    if (!property) {
      // also try MongoDB _id if client passed that
      try { property = await Property.findById(req.params.id); } catch (e) {}
    }
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json(property);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/properties', async (req, res) => {
  try {
    console.log('POST /api/properties - Request body:', req.body);
    console.log('Images in request:', req.body.images);
    console.log('Videos in request:', req.body.videos);
    
    const {
      title, price, location, bedrooms, bathrooms, size, type, description,
      images, videos, amenities, featured, status, virtualTour, yearBuilt,
      parking, floor, furnished, petFriendly, garden, balcony, securitySystem,
      nearbyFacilities
    } = req.body;

    const id = uuidv4();
    const doc = await Property.create({
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
    });

    console.log('Property created successfully with ID:', id);
    res.status(201).json({ id: doc.id, message: 'Property created successfully' });
  } catch (error) {
    console.error('Error creating property:', error);
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

    await Property.findOneAndUpdate(
      { id: req.params.id },
      {
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
      }
    );

    res.json({ message: 'Property updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/properties/:id', async (req, res) => {
  try {
    await Property.deleteOne({ id: req.params.id });
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', uploadWithLimits.array('files'), async (req, res) => {
  try {
    console.log('POST /api/upload - Files received:', req.files?.length || 0);
    const uploadedFiles = [];

    const bucket = getGridFSBucket();
    for (const file of req.files) {
      const originalName = file.originalname || `${uuidv4()}${path.extname(file.originalname || '')}`;

      // Write buffer to GridFS
      const gridId = await new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(originalName, { contentType: file.mimetype });
        uploadStream.on('error', reject);
        uploadStream.on('finish', () => resolve(uploadStream.id));
        uploadStream.end(file.buffer);
      });

      const media = new Media({
        filename: originalName,
        url: `/api/files/${gridId.toString()}`,
        mimetype: file.mimetype,
        size: file.size,
        gridFsId: gridId
      });

      await media.save();
      console.log('Media saved to MongoDB with ID:', media._id, 'GridFS ID:', gridId.toString());

      uploadedFiles.push({
        id: media._id,
        filename: originalName,
        url: `/api/files/${gridId.toString()}`,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: media.uploadedAt
      });
    }

    console.log('Upload response files:', uploadedFiles);
    res.json({ files: uploadedFiles });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/files/:gridId', async (req, res) => {
  try {
    const gridId = req.params.gridId;
    const bucket = getGridFSBucket();

    // Try to lookup metadata from Media collection for content type
    const mediaDoc = await Media.findOne({ gridFsId: gridId }) || null;
    if (mediaDoc?.mimetype) {
      res.setHeader('Content-Type', mediaDoc.mimetype);
    }

    const downloadStream = bucket.openDownloadStream(new (require('mongodb').ObjectId)(gridId));
    downloadStream.on('error', (err) => {
      console.error('Download error:', err);
      return res.status(404).json({ error: 'File not found' });
    });
    downloadStream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Media gallery endpoints
app.get('/api/files', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const files = await Media.find()
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Media.countDocuments();

    res.json({
      files,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalFiles: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User settings API
app.get('/api/user', async (req, res) => {
  try {
    let user = await User.findOne({ id: '1' });
    if (!user) {
      user = await User.create({ id: '1' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/user', async (req, res) => {
  try {
    const { name, email, phone, location, bio, theme, language, currency, notifications } = req.body;

    await User.findOneAndUpdate(
      { id: '1' },
      {
        name,
        email,
        phone,
        location,
        bio,
        theme: theme || 'light',
        language: language || 'en',
        currency: currency || 'rwf',
        notifications: notifications || {},
      },
      { upsert: true }
    );
    res.json({ message: 'User settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics API
app.get('/api/analytics', async (req, res) => {
  try {
    const totalProperties = await Property.countDocuments();
    const activeProperties = await Property.countDocuments({ status: 'active' });
    const featuredProperties = await Property.countDocuments({ featured: true });

    const analytics = {
      totalProperties,
      activeProperties,
      featuredProperties,
      totalViews: Math.floor(Math.random() * 5000) + 2000,
      totalContacts: Math.floor(Math.random() * 500) + 100,
      conversionRate: (Math.random() * 10 + 5).toFixed(1),
      avgResponseTime: (Math.random() * 4 + 1).toFixed(1)
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
