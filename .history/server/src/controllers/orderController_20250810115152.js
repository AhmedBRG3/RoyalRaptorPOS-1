const Order = require('../models/Order');
const Product = require('../models/Product');

async function getOrders(req, res, next) {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
}

async function createOrder(req, res, next) {
  try {
    const { items } = req.body; // [{ productId, quantity }]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order items are required' });
    }

    // Fetch product info and compute totals
    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const normalizedItems = [];
    let total = 0;
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) return res.status(400).json({ message: `Invalid product: ${item.productId}` });
      const quantity = Math.max(1, Number(item.quantity || 1));
      const price = product.price;
      const lineTotal = price * quantity;
      total += lineTotal;
      normalizedItems.push({ product: product._id, name: product.name, price, quantity });
    }

    // Update inventory: decrement quantity, increment sold
    for (const item of normalizedItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: -item.quantity, sold: item.quantity } },
        { new: false }
      );
    }

    const order = await Order.create({ items: normalizedItems, total });
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
}

module.exports = { getOrders, createOrder };


