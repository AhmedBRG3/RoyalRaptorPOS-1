const { Schema, model, Types } = require('mongoose');

const sessionSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true },
    startTime: { type: Date, default: () => new Date() },
    endTime: { type: Date },
    startingBalance: { type: Number, default: 0, min: 0 },
    endingBalance: { type: Number, default: 0, min: 0 },
    sales: [{ type: Types.ObjectId, ref: 'Sale' }],
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = model('Session', sessionSchema);


