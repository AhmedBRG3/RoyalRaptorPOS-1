const { Schema, model } = require("mongoose");

const productSchema = new Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true, uppercase: true },
    price: { type: Number, required: true, min: 0 },
    minPrice: { type: Number, min: 0 },
    quantity: { type: Number, default: 0, min: 0 },
    sold: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Ensure min/max consistency
productSchema.pre('save', function(next) {
  if (typeof this.minPrice === 'number' && this.price < this.minPrice) {
    this.price = this.minPrice;
  }
  next();
});

module.exports = model("Product", productSchema);
