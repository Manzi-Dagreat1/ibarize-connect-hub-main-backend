const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true, unique: true }, // fixed to '1'
    name: { type: String, default: 'IBARIZE REAL ESTATE' },
    email: { type: String, default: 'broker@ibarize.com' },
    phone: { type: String, default: '+250 780 429 006' },
    location: { type: String, default: 'KICUKIRO CENTER - Behind Bank BPR' },
    bio: { type: String, default: '' },
    theme: { type: String, default: 'light' },
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'rwf' },
    notifications: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
