const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Setting = require('../models/Setting');

async function listSales(req, res, next) {
  try {
    const filter = (req.user?.admin || req.user?.finance) ? {} : { user: req.user?.sub };
    const sales = await Sale.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('user', 'username')
      .populate({ path: 'items.product', select: 'sku' });
    res.json(sales);
  } catch (e) {
    next(e);
  }
}

async function createSale(req, res, next) {
  try {
    const { items, vat = 0, serviceFee = 0, payments } = req.body; // items: [{ productId, quantity }], payments: { cash, bank }
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
      // Enforce price bounds; allow client to send optional override price within min/max, else use p.price
      let unitPrice = p.price;
      if (typeof i.price !== 'undefined') {
        const min = typeof p.minPrice === 'number' ? p.minPrice : 0;
        const max = p.price; // cap at base price
        const requested = Number(i.price);
        if (isNaN(requested) || requested < min || requested > max) {
          return res.status(400).json({ message: `Price for ${p.name} must be between ${min} and ${max}` });
        }
        unitPrice = requested;
      }
      const available = Number(p.quantity ?? 0);
      if (available <= 0) {
        return res.status(400).json({ message: `${p.name} is out of stock` });
      }
      if (quantity > available) {
        return res.status(400).json({ message: `Insufficient stock for ${p.name}. Available: ${available}, requested: ${quantity}` });
      }
      const lineTotal = unitPrice * quantity;
      total += lineTotal;
      normalized.push({ product: p._id, name: p.name, sku: p.sku, price: unitPrice, quantity, basePrice: p.price });
    }

    // Treat vat and serviceFee as percentages of subtotal and round to cents
    const vatPct = Number(vat || 0);
    const servicePct = Number(serviceFee || 0);
    const vatAmount = Math.round((total * (isNaN(vatPct) ? 0 : vatPct / 100)) * 100) / 100;
    const serviceAmount = Math.round((total * (isNaN(servicePct) ? 0 : servicePct / 100)) * 100) / 100;
    const finalTotal = Math.round((total + vatAmount + serviceAmount) * 100) / 100;

    // Validate payments breakdown if provided
    const cash = Number(payments?.cash || 0);
    const bank = Number(payments?.bank || 0);
    if (cash < 0 || bank < 0) {
      return res.status(400).json({ message: 'Payments cannot be negative' });
    }
    const paidCents = Math.round((cash + bank) * 100);
    const finalCents = Math.round(finalTotal * 100);
    console.log('[SALE] Payment check', { subtotal: total, vatAmount, serviceAmount, finalTotal, cash, bank, paid: cash + bank, paidCents, finalCents });
    // Allow off-by-a-cent differences
    if (Math.abs(paidCents - finalCents) > 1) {
      return res.status(400).json({ message: `Cash + Bank must equal sale total (paid ${((cash+bank)).toFixed(2)}, total ${finalTotal.toFixed(2)})` });
    }

    // Update inventory
    for (const item of normalized) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: -item.quantity, sold: item.quantity } }
      );
    }

    // Generate sequential saleNumber, resetting every 500 (1..500 loop)
    const setting = await Setting.findOne();
    let nextNumber = 1;
    if (setting) {
      const current = Number(setting.saleCounter || 0);
      nextNumber = (current % 500) + 1;
      setting.saleCounter = current + 1;
      await setting.save();
    }

    const sale = await Sale.create({ items: normalized, total, vat: vatAmount, serviceFee: serviceAmount, finalTotal, saleNumber: nextNumber, user: req.user?.sub, session: req.headers['x-session-id'] || undefined, payments: { cash, bank } });
    // Link sale to session and update ending balance if present
    const Session = require('../models/Session');
    const sessionId = req.headers['x-session-id'];
    if (sessionId) {
      await Session.findByIdAndUpdate(sessionId, {
        $push: { sales: sale._id },
        $inc: { endingCash: cash, endingBank: bank },
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
      await Session.findByIdAndUpdate(sale.session, { $inc: { endingCash: -(sale.payments?.cash || 0), endingBank: -(sale.payments?.bank || 0) } });
    }
    res.json(sale);
  } catch (e) {
    next(e);
  }
}

module.exports.refundSale = refundSale;


