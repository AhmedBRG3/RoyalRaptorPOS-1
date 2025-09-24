import { useEffect, useMemo, useRef, useState } from "react";
import Topbar from "../components/Topbar.jsx";
import { exportToCsv } from "../utils/exportCsv";
import {
  fetchAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  fetchTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  fetchSalesByType,
} from "../api";

export default function Accounting() {
  const [accounts, setAccounts] = useState([]);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ credit: 0, debit: 0, balance: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    accountId: "",
    subaccountName: "",
  });

  const selectedAccount = useMemo(() => accounts.find((a) => a._id === filters.accountId), [accounts, filters.accountId]);
  const subaccountOptions = selectedAccount?.subaccounts || [];

  async function loadAccounts() {
    const list = await fetchAccounts();
    setAccounts(list);
  }

  async function loadTransactions() {
    setLoading(true);
    setError("");
    try {
      const params = { ...filters };
      if (!params.accountId) delete params.accountId;
      if (!params.subaccountName) delete params.subaccountName;
      if (!params.startDate) delete params.startDate;
      if (!params.endDate) delete params.endDate;
      const { rows, totals } = await fetchTransactions(params);
      setRows(rows);
      setTotals(totals);
    } catch (e) {
      setError("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.startDate, filters.endDate, filters.accountId, filters.subaccountName]);

  const [editingTxnId, setEditingTxnId] = useState(null);
  const [draft, setDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    accountId: "",
    subaccountName: "",
    description: "",
    credit: 0,
    debit: 0,
  });
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [salesModal, setSalesModal] = useState({ open: false, title: '', rows: [] });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountModalMode, setAccountModalMode] = useState("create"); // 'create' | 'rename'
  const [accountDraftName, setAccountDraftName] = useState("");

  useEffect(() => {
    setDraft((d) => ({ ...d, accountId: filters.accountId }));
  }, [filters.accountId]);

  function onEdit(row) {
    setEditingTxnId(row._id);
    setDraft({
      date: row.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      accountId: row.accountId,
      subaccountName: row.subaccountName || "",
      description: row.description || "",
      credit: row.credit || 0,
      debit: row.debit || 0,
    });
    setShowTxnModal(true);
  }

  async function onSubmit(e) {
    e?.preventDefault?.();
    const payload = { ...draft, credit: Number(draft.credit) || 0, debit: Number(draft.debit) || 0 };
    try {
      if (editingTxnId) {
        await updateTransaction(editingTxnId, payload);
      } else {
        await createTransaction(payload);
      }
      setDraft({ date: new Date().toISOString().slice(0, 10), accountId: filters.accountId || "", subaccountName: "", description: "", credit: 0, debit: 0 });
      setEditingTxnId(null);
      setShowTxnModal(false);
      await loadTransactions();
    } catch {
      alert("Failed to save transaction");
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this transaction?")) return;
    try {
      await deleteTransaction(id);
      await loadTransactions();
    } catch {
      alert("Failed to delete transaction");
    }
  }

  async function openLinkedSales(type) {
    try {
      const rows = await fetchSalesByType({ type, startDate: filters.startDate, endDate: filters.endDate });
      const title = type === 'cash' ? 'Cash Receipts' : type === 'bank' ? 'Bank Receipts' : 'Refunds';
      setSalesModal({ open: true, title, rows });
    } catch {
      alert('Failed to load sales');
    }
  }

  // Account CRUD via modal
  async function addAccount(name) {
    if (!name.trim()) return;
    const acc = await createAccount({ name: name.trim() });
    setAccounts((a) => [...a, acc]);
  }

  async function renameAccount(id, name) {
    const updated = await updateAccount(id, { name });
    setAccounts((list) => list.map((a) => (a._id === id ? updated : a)));
  }

  async function removeAccount(id) {
    if (!confirm("Delete this account?")) return;
    await deleteAccount(id);
    setAccounts((list) => list.filter((a) => a._id !== id));
    if (filters.accountId === id) setFilters((f) => ({ ...f, accountId: "", subaccountName: "" }));
  }

  function runningBalanceUntil(index) {
    let bal = 0;
    for (let i = 0; i <= index; i++) {
      bal += (rows[i].debit || 0) - (rows[i].credit || 0);
    }
    return bal;
  }

  function exportCsv() {
    let running = 0;
    const exportRows = rows.map((r) => {
      running += (r.debit || 0) - (r.credit || 0);
      return {
        date: new Date(r.date).toISOString().slice(0, 10),
        account: r.accountName,
        subaccount: r.subaccountName || "",
        description: r.description || "",
        credit: Number(r.credit || 0).toFixed(2),
        debit: Number(r.debit || 0).toFixed(2),
        balance: running.toFixed(2),
      };
    });
    exportToCsv("accounting.csv", exportRows, [
      { key: "date", header: "Date" },
      { key: "account", header: "Account" },
      { key: "subaccount", header: "Subaccount" },
      { key: "description", header: "Description" },
      { key: "credit", header: "Credit" },
      { key: "debit", header: "Debit" },
      { key: "balance", header: "Balance" },
    ]);
  }

  return (
    <div className="flex flex-col mt-24 mx-8 pb-24">
      <Topbar title="Accounting" />

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={() => setShowFilterModal(true)}>Filters</button>
          <button className="bg-green-600 text-white px-3 py-2 rounded" onClick={() => { setEditingTxnId(null); setDraft({ date: new Date().toISOString().slice(0, 10), accountId: filters.accountId || "", subaccountName: "", description: "", credit: 0, debit: 0 }); setShowTxnModal(true); }}>Add Transaction</button>
          <button className="bg-emerald-600 text-white px-3 py-2 rounded" onClick={() => { setAccountModalMode("create"); setAccountDraftName(""); setShowAccountModal(true); }}>Add Account</button>
          {filters.accountId && (
            <>
              <button className="bg-yellow-600 text-white px-3 py-2 rounded" onClick={() => { setAccountModalMode("rename"); setAccountDraftName(selectedAccount?.name || ""); setShowAccountModal(true); }}>Rename Selected</button>
              <button className="bg-red-600 text-white px-3 py-2 rounded" onClick={() => removeAccount(filters.accountId)}>Delete Selected</button>
            </>
          )}
          <button className="ml-auto bg-gray-700 text-white px-3 py-2 rounded" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      {/* Modals */}
      {showTxnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTxnModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-[840px] max-w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">{editingTxnId ? "Edit Transaction" : "Add Transaction"}</h2>
              <button onClick={() => setShowTxnModal(false)} className="px-2 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200">Close</button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <label className="text-sm">Date
                  <input type="date" className="border rounded px-2 py-1 w-full" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
                </label>
                <label className="text-sm">Account
                  <select className="border rounded px-2 py-1 w-full" value={draft.accountId} onChange={(e) => setDraft({ ...draft, accountId: e.target.value, subaccountName: "" })}>
                    <option value="">Select account</option>
                    {accounts.map((a) => (
                      <option key={a._id} value={a._id}>{a.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">Subaccount
                  <input placeholder="Subaccount (text)" className="border rounded px-2 py-1 w-full" value={draft.subaccountName} onChange={(e) => setDraft({ ...draft, subaccountName: e.target.value })} />
                </label>
                <label className="text-sm lg:col-span-2">Description
                  <input placeholder="Description" className="border rounded px-2 py-1 w-full" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                </label>
                <label className="text-sm">Credit
                  <input type="number" step="0.01" className="border rounded px-2 py-1 w-full" value={draft.credit} onChange={(e) => setDraft({ ...draft, credit: e.target.value })} />
                </label>
                <label className="text-sm">Debit
                  <input type="number" step="0.01" className="border rounded px-2 py-1 w-full" value={draft.debit} onChange={(e) => setDraft({ ...draft, debit: e.target.value })} />
                </label>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowTxnModal(false)} className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">Cancel</button>
                <button type="submit" className="text-sm px-3 py-1 rounded bg-blue-600 text-white">{editingTxnId ? "Update" : "Add"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilterModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-[720px] max-w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button onClick={() => setShowFilterModal(false)} className="px-2 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200">Close</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <label className="text-sm">Start Date
                <input type="date" className="border rounded px-2 py-1 w-full" value={filters.startDate} onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))} />
              </label>
              <label className="text-sm">End Date
                <input type="date" className="border rounded px-2 py-1 w-full" value={filters.endDate} onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))} />
              </label>
              <label className="text-sm">Account
                <select className="border rounded px-2 py-1 w-full" value={filters.accountId} onChange={(e) => setFilters((f) => ({ ...f, accountId: e.target.value }))}>
                  <option value="">All</option>
                  {accounts.map((a) => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm col-span-2">Subaccount
                <input className="border rounded px-2 py-1 w-full" placeholder="Type to filter" value={filters.subaccountName} onChange={(e) => setFilters((f) => ({ ...f, subaccountName: e.target.value }))} />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setShowFilterModal(false)} className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button type="button" onClick={() => { setShowFilterModal(false); loadTransactions(); }} className="text-sm px-3 py-1 rounded bg-blue-600 text-white">Apply</button>
            </div>
          </div>
        </div>
      )}

      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAccountModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-[520px] max-w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">{accountModalMode === "create" ? "Add Account" : "Rename Account"}</h2>
              <button onClick={() => setShowAccountModal(false)} className="px-2 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200">Close</button>
            </div>
            <div className="space-y-3">
              <label className="text-sm block">Account Name
                <input className="border rounded px-2 py-1 w-full" value={accountDraftName} onChange={(e) => setAccountDraftName(e.target.value)} />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setShowAccountModal(false)} className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button type="button" onClick={async () => {
                try {
                  if (accountModalMode === "create") {
                    await addAccount(accountDraftName);
                  } else if (filters.accountId) {
                    await renameAccount(filters.accountId, accountDraftName);
                  }
                  setShowAccountModal(false);
                } catch {
                  alert("Failed to save account");
                }
              }} className="text-sm px-3 py-1 rounded bg-blue-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-auto">
        {loading ? (
          <p className="p-4">Loading…</p>
        ) : error ? (
          <p className="p-4 text-red-600">{error}</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr className="text-left border-b">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Subaccount</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2 text-right">Credit</th>
                <th className="px-3 py-2 text-right">Debit</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r._id || idx} className="border-b hover:bg-gray-50 text-left">
                  <td className="px-3 py-2">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{r.accountName}</td>
                  <td className="px-3 py-2">{r.subaccountName || ""}</td>
                  <td className="px-3 py-2">
                    {r._linkType ? (
                      <button className="text-blue-600 underline" onClick={() => openLinkedSales(r._linkType)}>{r.description || ""}</button>
                    ) : (
                      r.description || ""
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{(r.credit || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{(r.debit || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{runningBalanceUntil(idx).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button className="text-blue-600" onClick={() => onEdit(r)}>Edit</button>
                      <button className="text-red-600" onClick={() => onDelete(r._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-3 py-2 font-semibold" colSpan={4}>Totals</td>
                <td className="px-3 py-2 text-right font-semibold">{(totals.credit || 0).toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-semibold">{(totals.debit || 0).toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-semibold">{(totals.balance || 0).toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {salesModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSalesModal({ open: false, title: '', rows: [] })} />
          <div className="relative bg-white rounded-lg shadow-xl w-[900px] max-w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">{salesModal.title}</h2>
              <button onClick={() => setSalesModal({ open: false, title: '', rows: [] })} className="px-2 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200">Close</button>
            </div>
            <div className="overflow-auto max-h-[70vh]">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2 text-right">Items</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Cash</th>
                    <th className="px-3 py-2 text-right">Bank</th>
                    <th className="px-3 py-2">Sale ID</th>
                  </tr>
                </thead>
                <tbody>
                  {salesModal.rows.map((s) => (
                    <tr key={s._id} className="border-b">
                      <td className="px-3 py-2">{new Date(s.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2">{s.user?.username || '-'}</td>
                      <td className="px-3 py-2 text-right">{s.items?.reduce((a, i) => a + (i.quantity || 0), 0) || 0}</td>
                      <td className="px-3 py-2 text-right">{Number(s.finalTotal || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{Number(s.payments?.cash || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{Number(s.payments?.bank || 0).toFixed(2)}</td>
                      <td className="px-3 py-2">{s.saleNumber || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


