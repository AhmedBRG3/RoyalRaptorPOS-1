const serverless = require('serverless-http');
const { connectDB } = require('./config/db');
const app = require('./app');

// Connect to MongoDB when the Lambda container starts
let isConnected = false;
let connectionPromise = null;

const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }
  
  if (connectionPromise) {
    return connectionPromise;
  }
  
  connectionPromise = (async () => {
    try {
      await connectDB();
      isConnected = true;
      console.log('Connected to MongoDB successfully');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      isConnected = false;
      connectionPromise = null;
      throw error;
    }
  })();
  
  return connectionPromise;
};

// Create the serverless handler with better error handling
const handler = serverless(app, {
  request: async (request, event, context) => {
    console.log('Request received:', {
      method: request.method,
      url: request.url,
      headers: request.headers,
      event: event
    });
    
    // For health check and OPTIONS requests, skip database connection
    if (request.url === '/api/health' || request.method === 'OPTIONS') {
      console.log(`${request.method} request - skipping database connection`);
      return request;
    }
    
    // Ensure database connection before handling requests
    try {
      await connectToDatabase();
    } catch (error) {
      console.error('Database connection failed:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Database connection failed',
          message: error.message
        })
      };
    }
    
    return request;
  },
  response: (response, request, event, context) => {
    console.log('Response sent:', {
      statusCode: response.statusCode,
      headers: response.headers
    });
    return response;
  }
});

// Export the handler for AWS Lambda
module.exports.handler = handler;
