const { Schema, model } = require('mongoose');

const settingSchema = new Schema(
  {
    masterPasswordHash: { type: String, required: true },
    saleCounter: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = model('Setting', settingSchema);


 

