const express = require('express');
const { listSales, createSale, refundSale } = require('../controllers/saleController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, listSales);
router.post('/', requireAuth, createSale);
router.post('/:id/refund', requireAuth, requireAdmin, refundSale);

module.exports = router;


