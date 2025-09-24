const express = require("express");
const {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  listTransactions,
  listSalesForType,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require("../controllers/accountingController");
const { requireAuth, requireFinance } = require("../middleware/authMiddleware");

const router = express.Router();

// Accounts
router.get("/accounts", requireAuth, requireFinance, listAccounts);
router.post("/accounts", requireAuth, requireFinance, createAccount);
router.put("/accounts/:id", requireAuth, requireFinance, updateAccount);
router.delete("/accounts/:id", requireAuth, requireFinance, deleteAccount);

// Transactions
router.get("/transactions", requireAuth, requireFinance, listTransactions);
router.get("/transactions/sales-by-type", requireAuth, requireFinance, listSalesForType);
router.post("/transactions", requireAuth, requireFinance, createTransaction);
router.put("/transactions/:id", requireAuth, requireFinance, updateTransaction);
router.delete("/transactions/:id", requireAuth, requireFinance, deleteTransaction);

module.exports = router;


