const { Schema, model, Types } = require('mongoose');

const orderItemSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    items: { type: [orderItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'paid', 'void'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = model('Order', orderSchema);


