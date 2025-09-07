const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { connectDB, initDatabase, runQuery, getQuery, allQuery } = require('./database');
const Media = require('./models/Media');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Static files for uploads
app.use('/uploads', express.static(uploadsDir));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Connect to MongoDB
connectDB();

// Routes

// Properties API
app.get('/api/properties', async (req, res) => {
  try {
    const properties = await allQuery('SELECT * FROM properties ORDER BY createdAt DESC');
    const formattedProperties = properties.map(prop => ({
      ...prop,
      images: prop.images ? JSON.parse(prop.images) : [],
      videos: prop.videos ? JSON.parse(prop.videos) : [],
      amenities: prop.amenities ? JSON.parse(prop.amenities) : [],
      nearbyFacilities: prop.nearbyFacilities ? JSON.parse(prop.nearbyFacilities) : []
    }));
    res.json(formattedProperties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/properties/:id', async (req, res) => {
  try {
    const property = await getQuery('SELECT * FROM properties WHERE id = ?', [req.params.id]);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    const formattedProperty = {
      ...property,
      images: property.images ? JSON.parse(property.images) : [],
      videos: property.videos ? JSON.parse(property.videos) : [],
      amenities: property.amenities ? JSON.parse(property.amenities) : [],
      nearbyFacilities: property.nearbyFacilities ? JSON.parse(property.nearbyFacilities) : []
    };
    res.json(formattedProperty);
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
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    console.log('About to insert property with images:', images, 'and videos:', videos);

    await runQuery(`
      INSERT INTO properties (
        id, title, price, location, bedrooms, bathrooms, size, type, description,
        images, videos, amenities, featured, status, virtualTour, yearBuilt,
        parking, floor, furnished, petFriendly, garden, balcony, securitySystem,
        nearbyFacilities, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, title, price, location, bedrooms || 1, bathrooms || 1, size, type || 'apartment', description,
      JSON.stringify(images || []), JSON.stringify(videos || []), JSON.stringify(amenities || []),
      featured ? 1 : 0, status || 'active', virtualTour, yearBuilt, parking || 0, floor || 1,
      furnished ? 1 : 0, petFriendly ? 1 : 0, garden ? 1 : 0, balcony ? 1 : 0, securitySystem ? 1 : 0,
      JSON.stringify(nearbyFacilities || []), createdAt, updatedAt
    ]);

    console.log('Property created successfully with ID:', id);
    res.status(201).json({ id, message: 'Property created successfully' });
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

    const updatedAt = new Date().toISOString();

    await runQuery(`
      UPDATE properties SET
        title = ?, price = ?, location = ?, bedrooms = ?, bathrooms = ?, size = ?,
        type = ?, description = ?, images = ?, videos = ?, amenities = ?,
        featured = ?, status = ?, virtualTour = ?, yearBuilt = ?, parking = ?,
        floor = ?, furnished = ?, petFriendly = ?, garden = ?, balcony = ?,
        securitySystem = ?, nearbyFacilities = ?, updatedAt = ?
      WHERE id = ?
    `, [
      title, price, location, bedrooms || 1, bathrooms || 1, size, type || 'apartment', description,
      JSON.stringify(images || []), JSON.stringify(videos || []), JSON.stringify(amenities || []),
      featured ? 1 : 0, status || 'active', virtualTour, yearBuilt, parking || 0, floor || 1,
      furnished ? 1 : 0, petFriendly ? 1 : 0, garden ? 1 : 0, balcony ? 1 : 0, securitySystem ? 1 : 0,
      JSON.stringify(nearbyFacilities || []), updatedAt, req.params.id
    ]);

    res.json({ message: 'Property updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/properties/:id', async (req, res) => {
  try {
    await runQuery('DELETE FROM properties WHERE id = ?', [req.params.id]);
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

const uploadWithLimits = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter
});

app.post('/api/upload', uploadWithLimits.array('files'), async (req, res) => {
  try {
    console.log('POST /api/upload - Files received:', req.files?.length || 0);
    const uploadedFiles = [];

    for (const file of req.files) {
      const media = new Media({
        filename: file.filename,
        url: `/api/files/${file.filename}`, // Changed to use /api/files/ format
        mimetype: file.mimetype,
        size: file.size
      });

      await media.save();
      console.log('Media saved to MongoDB with ID:', media._id);
      
      uploadedFiles.push({
        id: media._id,
        filename: file.filename,
        url: `/api/files/${media._id}`, // Use MongoDB ID in URL
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

app.get('/api/files/:id', async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(uploadsDir, media.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User settings API
app.get('/api/user', async (req, res) => {
  try {
    const user = await getQuery('SELECT * FROM users WHERE id = ?', ['1']);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const formattedUser = {
      ...user,
      notifications: user.notifications ? JSON.parse(user.notifications) : {}
    };
    res.json(formattedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/user', async (req, res) => {
  try {
    const { name, email, phone, location, bio, theme, language, currency, notifications } = req.body;
    const updatedAt = new Date().toISOString();

    await runQuery(`
      UPDATE users SET
        name = ?, email = ?, phone = ?, location = ?, bio = ?,
        theme = ?, language = ?, currency = ?, notifications = ?, updatedAt = ?
      WHERE id = ?
    `, [
      name, email, phone, location, bio, theme || 'light', language || 'en', currency || 'usd',
      JSON.stringify(notifications || {}), updatedAt, '1'
    ]);

    res.json({ message: 'User settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics API
app.get('/api/analytics', async (req, res) => {
  try {
    const properties = await allQuery('SELECT COUNT(*) as total FROM properties');
    const activeProperties = await allQuery('SELECT COUNT(*) as active FROM properties WHERE status = ?', ['active']);
    const featuredProperties = await allQuery('SELECT COUNT(*) as featured FROM properties WHERE featured = 1');

    // Mock analytics data
    const analytics = {
      totalProperties: properties[0].total,
      activeProperties: activeProperties[0].active,
      featuredProperties: featuredProperties[0].featured,
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
