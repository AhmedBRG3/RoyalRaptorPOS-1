const express = require('express');
const { getProducts, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, getProducts);
router.post('/', requireAuth, requireAdmin, createProduct);
router.put('/:id', requireAuth, requireAdmin, updateProduct);
router.delete('/:id', requireAuth, requireAdmin, deleteProduct);

module.exports = router;


