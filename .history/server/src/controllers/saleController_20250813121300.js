const Sale = require('../models/Sale');
const Product = require('../models/Product');

async function listSales(req, res, next) {
  try {
    const filter = (req.user?.admin || req.user?.finance) ? {} : { user: req.user?.sub };
    const sales = await Sale.find(filter).sort({ createdAt: -1 }).limit(100).populate('user', 'username');
    res.json(sales);
  } catch (e) {
    next(e);
  }
}

async function createSale(req, res, next) {
  try {
    const { items, vat = 0, serviceFee = 0 } = req.body; // items: [{ productId, quantity }]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items are required' });
    }

    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const normalized = [];
    let total = 0;
    for (const i of items) {
      const p = productMap.get(i.productId);
      if (!p) return res.status(400).json({ message: `Invalid product: ${i.productId}` });
      const quantity = Math.max(1, Number(i.quantity || 1));
    const available = Number(p.quantity ?? 0);
    if (available <= 0) {
      return res.status(400).json({ message: `${p.name} is out of stock` });
    }
    if (quantity > available) {
      return res.status(400).json({ message: `Insufficient stock for ${p.name}. Available: ${available}, requested: ${quantity}` });
    }
      const lineTotal = p.price * quantity;
      total += lineTotal;
      normalized.push({ product: p._id, name: p.name, price: p.price, quantity });
    }

    // Treat vat and serviceFee as percentages of subtotal
    const vatPct = Number(vat || 0);
    const servicePct = Number(serviceFee || 0);
    const vatAmount = total * (isNaN(vatPct) ? 0 : vatPct / 100);
    const serviceAmount = total * (isNaN(servicePct) ? 0 : servicePct / 100);
    const finalTotal = total + vatAmount + serviceAmount;

    // Update inventory
    for (const item of normalized) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: -item.quantity, sold: item.quantity } }
      );
    }

    const sale = await Sale.create({ items: normalized, total, vat: vatAmount, serviceFee: serviceAmount, finalTotal, user: req.user?.sub, session: req.headers['x-session-id'] || undefined });
    // Link sale to session and update ending balance if present
    const Session = require('../models/Session');
    const sessionId = req.headers['x-session-id'];
    if (sessionId) {
      await Session.findByIdAndUpdate(sessionId, {
        $push: { sales: sale._id },
        $inc: { endingBalance: finalTotal },
      });
    }
    res.status(201).json(sale);
  } catch (e) {
    next(e);
  }
}

module.exports = { listSales, createSale };

async function refundSale(req, res, next) {
  try {
    const { id } = req.params;
    const sale = await Sale.findById(id);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    if (sale.refunded) return res.status(400).json({ message: 'Sale already refunded' });

    // Revert inventory
    for (const item of sale.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: item.quantity, sold: -item.quantity } }
      );
    }

    sale.refunded = true;
    sale.refundedAt = new Date();
    sale.refundedBy = req.user?.sub;
    await sale.save();
    // Adjust session endingBalance if linked
    const Session = require('../models/Session');
    if (sale.session) {
      await Session.findByIdAndUpdate(sale.session, { $inc: { endingBalance: -sale.finalTotal } });
    }
    res.json(sale);
  } catch (e) {
    next(e);
  }
}

module.exports.refundSale = refundSale;


