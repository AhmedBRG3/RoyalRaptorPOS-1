const { Schema, model, Types } = require('mongoose');

const saleItemSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: { type: String },
    price: { type: Number, required: true, min: 0 },
    basePrice: { type: Number, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const saleSchema = new Schema(
  {
    items: { type: [saleItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    vat: { type: Number, default: 0, min: 0 },
    serviceFee: { type: Number, default: 0, min: 0 },
    finalTotal: { type: Number, required: true, min: 0 },
    saleNumber: { type: Number, required: false },
    user: { type: Types.ObjectId, ref: 'User' },
    session: { type: Types.ObjectId, ref: 'Session' },
    payments: {
      cash: { type: Number, default: 0, min: 0 },
      bank: { type: Number, default: 0, min: 0 },
    },
    refunded: { type: Boolean, default: false },
    refundedAt: { type: Date },
    refundedBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = model('Sale', saleSchema);


