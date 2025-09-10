const express = require('express');
const { getProducts, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { requireAuth, requireAdmin, requireAdminOrEditPassword } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, getProducts);
router.post('/', requireAuth, requireAdminOrEditPassword, createProduct);
router.put('/:id', requireAuth, requireAdminOrEditPassword, updateProduct);
router.delete('/:id', requireAuth, requireAdminOrEditPassword, deleteProduct);

module.exports = router;


