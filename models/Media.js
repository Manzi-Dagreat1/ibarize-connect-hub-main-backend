const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  gridFsId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  }
});

module.exports = mongoose.model('Media', mediaSchema);
