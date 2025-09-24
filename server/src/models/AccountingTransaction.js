const { Schema, model, Types } = require("mongoose");

const accountingTransactionSchema = new Schema(
  {
    date: { type: Date, required: true },
    accountId: { type: Types.ObjectId, ref: "Account", required: true },
    accountName: { type: String, required: true },
    subaccountName: { type: String },
    description: { type: String, trim: true },
    credit: { type: Number, default: 0, min: 0 },
    debit: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = model("AccountingTransaction", accountingTransactionSchema);


