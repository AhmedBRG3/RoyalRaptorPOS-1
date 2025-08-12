const { Schema, model } = require("mongoose");

const productSchema = new Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true, uppercase: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 0, min: 0 },
    sold: { type: Number, default: 0, min: 0 },
    brand: { type: String },
  },
  { timestamps: true }
);

module.exports = model("Product", productSchema);
