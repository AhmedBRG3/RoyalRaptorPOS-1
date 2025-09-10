// Configuration with environment variable support for serverless deployment

const PORT = process.env.PORT || 5050;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://omarkhaled4040:2IIdJA0Gpnzbn3M1@royalraptors.dew6tql.mongodb.net/royalraptorpos';
const CLIENT_ORIGINS = process.env.CLIENT_ORIGINS 
  ? process.env.CLIENT_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
const JWT_SECRET = process.env.JWT_SECRET || 'royalraptor_dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

module.exports = {
  PORT,
  MONGO_URI,
  CLIENT_ORIGINS,
  JWT_SECRET,
  JWT_EXPIRES_IN,
};


