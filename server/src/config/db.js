const mongoose = require('mongoose');

const { MONGO_URI } = require('./config');

async function connectDB() {
  const mongoUri = MONGO_URI;
  const dbName = undefined;

  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri, { dbName });
  // eslint-disable-next-line no-console
  console.log('MongoDB connected');
}

module.exports = { connectDB };


