const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || (
    process.env.NODE_ENV === 'production'
      ? null
      : 'mongodb://127.0.0.1:27017/cinevora'
  );
  if (!mongoURI) throw new Error('MONGODB_URI is required in production');

  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    if (process.env.NODE_ENV === 'production') {
      throw err;
    }
    console.warn('Continuing without MongoDB in development mode (movie browsing and playback active).');
  }
};

module.exports = connectDB;
