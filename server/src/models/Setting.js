const { Schema, model } = require('mongoose');

const settingSchema = new Schema(
  {
    masterPasswordHash: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = model('Setting', settingSchema);


 

