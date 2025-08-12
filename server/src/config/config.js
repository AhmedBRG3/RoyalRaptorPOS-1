// Centralized static configuration (no environment variables)

const PORT = 5050;
const MONGO_URI = 'mongodb://127.0.0.1:27017/royalraptorpos';
const CLIENT_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];
const JWT_SECRET = 'royalraptor_dev_secret_change_me';
const JWT_EXPIRES_IN = '7d';

module.exports = {
  PORT,
  MONGO_URI,
  CLIENT_ORIGINS,
  JWT_SECRET,
  JWT_EXPIRES_IN,
};


