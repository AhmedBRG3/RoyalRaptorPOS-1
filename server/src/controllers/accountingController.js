const Account = require("../models/Account");
const AccountingTransaction = require("../models/AccountingTransaction");
const Sale = require("../models/Sale");

// ===== Accounts =====
async function listAccounts(req, res) {
  const accounts = await Account.find({}).sort({ name: 1 });
  res.json(accounts);
}

async function createAccount(req, res) {
  const { name, code, description, subaccounts, active } = req.body || {};
  const account = await Account.create({ name, code, description, subaccounts, active });
  res.status(201).json(account);
}

async function updateAccount(req, res) {
  const { id } = req.params;
  const updates = req.body || {};
  const updated = await Account.findByIdAndUpdate(id, updates, { new: true });
  if (!updated) return res.status(404).json({ message: "account not found" });
  res.json(updated);
}

async function deleteAccount(req, res) {
  const { id } = req.params;
  await Account.findByIdAndDelete(id);
  res.json({ ok: true });
}

// ===== Transactions =====
function buildTxnQuery({ startDate, endDate, accountId, accountName, subaccountName }) {
  const q = {};
  if (startDate || endDate) {
    q.date = {};
    if (startDate) q.date.$gte = new Date(startDate);
    if (endDate) q.date.$lte = new Date(endDate);
  }
  if (accountId) q.accountId = accountId;
  if (accountName) q.accountName = accountName;
  if (subaccountName) q.subaccountName = { $regex: subaccountName, $options: 'i' };
  return q;
}

async function listTransactions(req, res) {
  const { startDate, endDate, accountId, accountName, subaccountName } = req.query || {};
  const q = buildTxnQuery({ startDate, endDate, accountId, accountName, subaccountName });

  // Determine period for auto transactions
  const periodStart = startDate ? new Date(startDate) : new Date(0);
  const periodEnd = endDate ? new Date(endDate) : new Date();

  // Fetch manual transactions first
  const txns = await AccountingTransaction.find(q).sort({ date: 1, createdAt: 1 });

  // Compute auto rows: Sales and Refunds for the selected period
  const [salesAgg] = await Sale.aggregate([
    { $match: { createdAt: { $gte: periodStart, $lte: periodEnd }, refunded: false } },
    { $group: { _id: null, sum: { $sum: "$finalTotal" } } },
  ]);
  const [cashAgg] = await Sale.aggregate([
    { $match: { createdAt: { $gte: periodStart, $lte: periodEnd }, refunded: false } },
    { $group: { _id: null, sum: { $sum: "$payments.cash" } } },
  ]);
  const [bankAgg] = await Sale.aggregate([
    { $match: { createdAt: { $gte: periodStart, $lte: periodEnd }, refunded: false } },
    { $group: { _id: null, sum: { $sum: "$payments.bank" } } },
  ]);
  const [refundsAgg] = await Sale.aggregate([
    { $match: { refunded: true, refundedAt: { $gte: periodStart, $lte: periodEnd } } },
    { $group: { _id: null, sum: { $sum: "$finalTotal" } } },
  ]);
  const salesSum = Number(salesAgg?.sum || 0);
  const cashSum = Number(cashAgg?.sum || 0);
  const bankSum = Number(bankAgg?.sum || 0);
  const refundsSum = Number(refundsAgg?.sum || 0);

  const autoRows = [];

  if (cashSum > 0) {
    autoRows.push({
      date: periodEnd,
      accountId: null,
      accountName: "Cash Receipts",
      subaccountName: "",
      description: "Auto: Cash collected from sales (click to view)",
      credit: 0,
      debit: cashSum,
      createdAt: periodEnd,
      updatedAt: periodEnd,
      _linkType: 'cash',
    });
  }
  if (bankSum > 0) {
    autoRows.push({
      date: periodEnd,
      accountId: null,
      accountName: "Bank Receipts",
      subaccountName: "",
      description: "Auto: Bank collected from sales (click to view)",
      credit: 0,
      debit: bankSum,
      createdAt: periodEnd,
      updatedAt: periodEnd,
      _linkType: 'bank',
    });
  }
  if (refundsSum > 0) {
    autoRows.push({
      date: periodEnd,
      accountId: null,
      accountName: "Refunds",
      subaccountName: "",
      description: "Auto: Refunds total (click to view)",
      credit: refundsSum,
      debit: 0,
      createdAt: periodEnd,
      updatedAt: periodEnd,
      _linkType: 'refunds',
    });
  }

  // Combine: auto rows first, then manual ones (already sorted)
  const combined = [...autoRows, ...txns];

  // Compute running balance and totals over combined rows
  let running = 0;
  const rows = combined.map((t) => {
    running += (t.debit || 0) - (t.credit || 0);
    return {
      _id: t._id,
      date: t.date,
      accountId: t.accountId || undefined,
      accountName: t.accountName,
      subaccountName: t.subaccountName,
      description: t.description,
      credit: t.credit || 0,
      debit: t.debit || 0,
      balance: running,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      _linkType: t._linkType,
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.credit += r.credit || 0;
      acc.debit += r.debit || 0;
      acc.balance = r.balance; // last running balance
      return acc;
    },
    { credit: 0, debit: 0, balance: running }
  );

  res.json({ rows, totals });
}

// List sales for a given type within date range
async function listSalesForType(req, res) {
  const { type, startDate, endDate } = req.query || {};
  const periodStart = startDate ? new Date(startDate) : new Date(0);
  const periodEnd = endDate ? new Date(endDate) : new Date();
  const isRefund = type === 'refunds';

  const match = { createdAt: { $gte: periodStart, $lte: periodEnd }, refunded: isRefund };
  if (type === 'cash') match['payments.cash'] = { $gt: 0 };
  else if (type === 'bank') match['payments.bank'] = { $gt: 0 };
  else if (isRefund) match['refunded'] = true;

  const rows = await Sale.find(match).sort({ createdAt: -1 }).limit(1000).populate('user', 'username');
  res.json(rows);
}

async function createTransaction(req, res) {
  const { date, accountId, accountName, subaccountName, description, credit = 0, debit = 0 } = req.body || {};
  if (!accountId && !accountName) return res.status(400).json({ message: "account required" });

  let finalAccountId = accountId;
  let finalAccountName = accountName;
  if (accountId && !accountName) {
    const acc = await Account.findById(accountId);
    if (!acc) return res.status(400).json({ message: "invalid account" });
    finalAccountName = acc.name;
  }
  if (!accountId && accountName) {
    const acc = await Account.findOne({ name: accountName });
    if (!acc) return res.status(400).json({ message: "invalid account" });
    finalAccountId = acc._id;
  }

  const txn = await AccountingTransaction.create({
    date: date ? new Date(date) : new Date(),
    accountId: finalAccountId,
    accountName: finalAccountName,
    subaccountName,
    description,
    credit: Number(credit) || 0,
    debit: Number(debit) || 0,
  });

  res.status(201).json(txn);
}

async function updateTransaction(req, res) {
  const { id } = req.params;
  const updates = { ...req.body };
  if (updates.date) updates.date = new Date(updates.date);
  if (typeof updates.credit !== "undefined") updates.credit = Number(updates.credit) || 0;
  if (typeof updates.debit !== "undefined") updates.debit = Number(updates.debit) || 0;

  // Normalize account if name or id changed
  if (updates.accountId && !updates.accountName) {
    const acc = await Account.findById(updates.accountId);
    if (!acc) return res.status(400).json({ message: "invalid account" });
    updates.accountName = acc.name;
  }
  if (!updates.accountId && updates.accountName) {
    const acc = await Account.findOne({ name: updates.accountName });
    if (!acc) return res.status(400).json({ message: "invalid account" });
    updates.accountId = acc._id;
  }

  const updated = await AccountingTransaction.findByIdAndUpdate(id, updates, { new: true });
  if (!updated) return res.status(404).json({ message: "transaction not found" });
  res.json(updated);
}

async function deleteTransaction(req, res) {
  const { id } = req.params;
  await AccountingTransaction.findByIdAndDelete(id);
  res.json({ ok: true });
}

module.exports = {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  listTransactions,
  listSalesForType,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};


