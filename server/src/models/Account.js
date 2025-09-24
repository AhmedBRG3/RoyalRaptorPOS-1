const { Schema, model } = require("mongoose");

const accountSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, trim: true },
    description: { type: String, trim: true },
    subaccounts: [
      {
        name: { type: String, required: true, trim: true },
        code: { type: String, trim: true },
        description: { type: String, trim: true },
      },
    ],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Ensure unique code only when present
accountSchema.index({ code: 1 }, { unique: true, sparse: true });

module.exports = model("Account", accountSchema);


