const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true, unique: true }, // keep UUID as external id
    title: { type: String, required: true },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    bedrooms: { type: Number, default: 1 },
    bathrooms: { type: Number, default: 1 },
    size: { type: String },
    type: { type: String, default: 'apartment' },
    description: { type: String },
    images: { type: [String], default: [] },
    videos: { type: [String], default: [] },
    amenities: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
    status: { type: String, default: 'active' },
    virtualTour: { type: String },
    yearBuilt: { type: Number },
    parking: { type: Number, default: 0 },
    floor: { type: Number, default: 1 },
    furnished: { type: Boolean, default: false },
    petFriendly: { type: Boolean, default: false },
    garden: { type: Boolean, default: false },
    balcony: { type: Boolean, default: false },
    securitySystem: { type: Boolean, default: false },
    nearbyFacilities: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Property', propertySchema);
