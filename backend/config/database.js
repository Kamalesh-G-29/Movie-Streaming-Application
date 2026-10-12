const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || (
      process.env.NODE_ENV === 'production'
        ? null
        : 'mongodb://127.0.0.1:27017/cinevora'
    );
    if (!mongoURI) throw new Error('MONGODB_URI is required in production');

    await mongoose.connect(mongoURI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
};

module.exports = connectDB;