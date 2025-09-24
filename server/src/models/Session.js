const { Schema, model, Types } = require('mongoose');

const sessionSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true },
    startTime: { type: Date, default: () => new Date() },
    endTime: { type: Date },
    lastPingAt: { type: Date, default: () => new Date() },
    startingCash: { type: Number, default: 0, min: 0 },
    startingBank: { type: Number, default: 0, min: 0 },
    endingCash: { type: Number, default: 0, min: 0 },
    endingBank: { type: Number, default: 0, min: 0 },
    sales: [{ type: Types.ObjectId, ref: 'Sale' }],
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = model('Session', sessionSchema);


