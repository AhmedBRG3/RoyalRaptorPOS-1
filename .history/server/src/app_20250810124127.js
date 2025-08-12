const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const authRoutes = require('./routes/authRoutes');
const saleRoutes = require('./routes/saleRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();
const { CLIENT_ORIGINS } = require('./config/config');

const corsOptions = {
  origin: CLIENT_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id', 'x-session-id'],
};

app.use(cors(corsOptions));
// Express v5 no longer needs a global options wildcard; cors handles preflight
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'RoyalRaptorPOS' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/sessions', sessionRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;


