const { Schema, model, Types } = require('mongoose');

const saleItemSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
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
    user: { type: Types.ObjectId, ref: 'User' },
    session: { type: Types.ObjectId, ref: 'Session' },
    refunded: { type: Boolean, default: false },
    refundedAt: { type: Date },
    refundedBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = model('Sale', saleSchema);


