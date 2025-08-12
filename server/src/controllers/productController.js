const Product = require('../models/Product');

async function getProducts(req, res, next) {
  try {
    const { q } = req.query;
    const filter = q
      ? {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { sku: { $regex: q, $options: 'i' } },
          ],
        }
      : {};
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const { name, sku, price, quantity, sold } = req.body;
    const product = await Product.create({ name, sku, price, quantity, sold });
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;
    const product = await Product.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Product not found' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { getProducts, createProduct, updateProduct, deleteProduct };


