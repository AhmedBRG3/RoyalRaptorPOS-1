const { Schema, model } = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    admin: { type: Boolean, default: false },
    finance: { type: Boolean, default: false },
    printSettings: {
      labelWidthMm: { type: Number, default: 35 },
      labelHeightMm: { type: Number, default: 25 },
      rotateDegrees: { type: Number, default: 0 }, // 0, 90, 180, 270
      hPaddingPct: { type: Number, default: 0.04 }, // 0..0.5
      vPaddingPct: { type: Number, default: 0.08 }, // 0..0.5
      dpi: { type: Number, default: 600 },
      forcePortraitPage: { type: Boolean, default: false },
      pageOrientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
      printAsImage: { type: Boolean, default: true },
      // USB printing (WebUSB) settings
      usbEnabled: { type: Boolean, default: false },
      // Keep VID/PID as strings (e.g., "0x0A5F" or "2655") to preserve user input format
      usbVendorId: { type: String, default: '' },
      usbProductId: { type: String, default: '' },
      // Command language for raw printing
      usbCommandLanguage: { type: String, enum: ['zpl', 'escpos', 'tspl', 'cpcl', 'epl'], default: 'zpl' },
      // Enable verbose client-side USB debugging logs
      usbDebugEnabled: { type: Boolean, default: false },
      // When debugging, try sending on all OUT endpoints (bulk and interrupt)
      usbTryAllEndpoints: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = model('User', userSchema);


