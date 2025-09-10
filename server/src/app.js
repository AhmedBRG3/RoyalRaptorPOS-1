require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const os = require("os");
const serverless = require("serverless-http");
const { ensureSeeded } = require('./utils/bootstrap');

// Initialize MongoDB connection
let isConnected = false;
let connectionPromise = null;

async function connectDB() {
  if (isConnected) return;

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = mongoose
    .connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 60000,
      heartbeatFrequencyMS: 10000,
      ssl: true,
      tls: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,
      retryWrites: true,
      retryReads: true,
      directConnection: false,
      authSource: "admin",
    })
    .then(() => {
      isConnected = true;
      console.log("Connected to MongoDB");
      return mongoose.connection;
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err);
      isConnected = false;
      connectionPromise = null;
      throw err;
    });

  return connectionPromise;
}

// Handle MongoDB connection errors
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
  isConnected = false;
  connectionPromise = null;
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
  isConnected = false;
  connectionPromise = null;
});

const app = express();

// ===== CORS configuration =====
// CORS disabled for testing

// ===== Security Middleware =====
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

// ===== Body Parsing =====
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ===== Rate Limiting =====
// Uncomment and adjust if you need rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
// });
// app.use(limiter);

// ===== Cookie Parser =====
app.use(cookieParser());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

// Add request ID for tracking
app.use((req, res, next) => {
  req.requestId = Math.random().toString(36).substring(7);
  console.log(`[${req.requestId}] ${req.method} ${req.url}`);
  next();
});

// ===== Health Check Endpoints =====
app.get("/api/health", (req, res) => {
  console.log('[HEALTH] Health check requested');
  res.json({ 
    status: "ok", 
    service: "RoyalRaptorPOS",
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

app.get("/api/test", (req, res) => {
  console.log('[TEST] Test endpoint requested');
  res.json({ 
    status: "test endpoint working", 
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    env: process.env.NODE_ENV
  });
});

// Simple test endpoint without database
app.get("/api/simple-test", (req, res) => {
  console.log('[SIMPLE-TEST] Simple test requested');
  res.json({ 
    status: "Simple test working", 
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    message: "No database connection required"
  });
});

// Test POST endpoint without authentication
app.post("/api/test-post", (req, res) => {
  console.log('[TEST-POST] Test POST requested');
  console.log('[TEST-POST] Request body:', req.body);
  res.json({ 
    status: "Test POST working", 
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    receivedBody: req.body,
    message: "No authentication required"
  });
});

// ===== Routes =====
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const authRoutes = require("./routes/authRoutes");
const saleRoutes = require("./routes/saleRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
// const barcodeRoutes = require("./routes/printBarCode"); // Temporarily disabled due to sharp module issues

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/sessions", sessionRoutes);
// app.use("/api/barcode", barcodeRoutes); // Temporarily disabled due to sharp module issues

// ===== Error Handler =====
app.use((err, req, res, next) => {
  console.error("Error details:", {
    message: err.message,
    stack: err.stack,
    code: err.code,
    status: err.status,
  });

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      details: err.message,
    });
  }

  if (err.name === "UnauthorizedError") {
    return res.status(401).json({
      error: "Unauthorized",
      message: err.message,
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: err.message || "Something went wrong!",
    code: err.code,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// after all routes:
app.use((err, req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.status(err.status || 500).json({ error: err.message });
});

// ===== Helper Function: Get Local External IPv4 Address =====
function getLocalExternalIPv4() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "0.0.0.0";
}

// Lambda handler
const handler = async (event, context) => {
  // Set context.callbackWaitsForEmptyEventLoop to false to prevent hanging
  context.callbackWaitsForEmptyEventLoop = false;

  console.log('=== LAMBDA HANDLER START ===');
  console.log('Lambda handler called with event:', JSON.stringify(event, null, 2));
  console.log('Context:', JSON.stringify(context, null, 2));

  // Handle OPTIONS preflight requests
  const httpMethod = event.requestContext?.http?.method || event.httpMethod;
  if (httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    console.log('Event details:', {
      httpMethod: httpMethod,
      path: event.rawPath || event.path,
      headers: event.headers,
      requestContext: event.requestContext
    });
    
    // Get the requested headers from the preflight request
    const requestedHeaders = event.headers['access-control-request-headers'] || '';
    console.log('Requested headers:', requestedHeaders);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With,Accept,Origin,X-Session-Id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'OK' })
    };
  }

  // Log all non-OPTIONS requests
  if (httpMethod !== 'OPTIONS') {
    console.log(`Handling ${httpMethod} request`);
    console.log(`${httpMethod} Event details:`, {
      httpMethod: httpMethod,
      path: event.rawPath || event.path,
      headers: event.headers,
      body: event.body,
      requestContext: event.requestContext
    });
  }

  try {
    // Ensure DB connection before handling request
    await connectDB();
    await ensureSeeded();
    
    // Parse body if it's a Buffer (common issue with serverless-http)
    if (event.body && typeof event.body === 'string') {
      try {
        event.body = JSON.parse(event.body);
      } catch (e) {
        console.log('Failed to parse event.body as JSON:', e.message);
      }
    }
    
    console.log('About to call serverless(app) with event:', JSON.stringify(event, null, 2));
    const result = await serverless(app, {
      request: (request, event, context) => {
        console.log('Serverless-http request middleware called');
        console.log('Request details:', {
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: request.body
        });
        
        // Ensure body is properly parsed
        if (request.body && Buffer.isBuffer(request.body)) {
          try {
            request.body = JSON.parse(request.body.toString());
            console.log('Parsed body from Buffer:', request.body);
          } catch (e) {
            console.log('Failed to parse request.body as JSON:', e.message);
          }
        }
        return request;
      }
    })(event, context);
    
    // Add CORS headers to all responses
    if (result && result.headers) {
      result.headers['Access-Control-Allow-Origin'] = '*';
      result.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With,Accept,Origin,X-Session-Id';
      result.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS,PATCH';
      result.headers['Access-Control-Allow-Credentials'] = 'true';
    }
    
    console.log('Lambda handler result:', JSON.stringify(result, null, 2));
    console.log('=== LAMBDA HANDLER END ===');
    return result;
  } catch (error) {
    console.error("Lambda handler error:", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With,Accept,Origin,X-Session-Id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        message: "Database connection failed",
      }),
    };
  }
};

// Export both the app and the handler
module.exports = app;
module.exports.handler = handler;

// Only start the server if not in Lambda
if (process.env.NODE_ENV === "development") {
  const localIP = getLocalExternalIPv4();
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => ensureSeeded()).catch(() => {});

  if (process.env.HTTPS === "true") {
    const https = require("https");
    const fs = require("fs");
    const sslOptions = {
      key: fs.readFileSync("./certs/localhost-key.pem"),
      cert: fs.readFileSync("./certs/localhost.pem"),
    };
    https.createServer(sslOptions, app).listen(PORT, localIP, () => {
      console.log(`Server running on https://${localIP}:${PORT}`);
    });
  } else {
    app.listen(PORT, localIP, () => {
      console.log(`Server running on http://${localIP}:${PORT}`);
    });
  }
}
