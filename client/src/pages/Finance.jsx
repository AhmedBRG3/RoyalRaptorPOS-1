import { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
import { fetchSales } from "../api";
import { DollarSign, FileSpreadsheet, RefreshCw, Calendar } from "lucide-react";
import { exportToCsv } from "../utils/exportCsv";

export default function Finance() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchSales();
      setSales(data);
    } catch (e) {
      setError("Failed to load sales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = sales.filter(s => {
    const created = new Date(s.createdAt).getTime();
    if (fromDate) {
      const fromTs = new Date(fromDate + 'T00:00:00').getTime();
      if (created < fromTs) return false;
    }
    if (toDate) {
      const toTs = new Date(toDate + 'T23:59:59.999').getTime();
      if (created > toTs) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime; // newest first
  });

  // Derive VAT and Service amounts whether source data stores amounts or percentages
  const deriveAmounts = (s) => {
    const base = Number(s.total || 0);
    const vRaw = Number(s.vat || 0);
    const sfRaw = Number(s.serviceFee || 0);
    const asAmount = { vat: vRaw, service: sfRaw };
    const asPercent = {
      vat: base * (isNaN(vRaw) ? 0 : vRaw / 100),
      service: base * (isNaN(sfRaw) ? 0 : sfRaw / 100),
    };
    const final = Number(s.finalTotal || 0);
    if (final > 0) {
      const sumAmt = base + asAmount.vat + asAmount.service;
      const sumPct = base + asPercent.vat + asPercent.service;
      const diffAmt = Math.abs(sumAmt - final);
      const diffPct = Math.abs(sumPct - final);
      return diffAmt <= diffPct ? asAmount : asPercent;
    }
    // Heuristic fallback: small values likely percents
    if (vRaw <= 40 || sfRaw <= 40) return asPercent;
    return asAmount;
  };

  const totals = filtered.reduce(
    (acc, s) => {
      if (s.refunded) return acc;
      const { vat, service } = deriveAmounts(s);
      acc.gross += s.total || 0;
      acc.vat += vat || 0;
      acc.service += service || 0;
      acc.net += s.finalTotal || (s.total || 0) + (vat || 0) + (service || 0);
      acc.cash += Number(s.payments?.cash || 0);
      acc.bank += Number(s.payments?.bank || 0);
      return acc;
    },
    { gross: 0, vat: 0, service: 0, net: 0, cash: 0, bank: 0 }
  );

  const onExport = () => {
    const rows = sorted.map(s => {
      const { vat, service } = deriveAmounts(s);
      return ({
      receipt: s.saleNumber ?? "",
      date: new Date(s.createdAt).toLocaleString(),
      user: s.user?.username || '-',
      items: s.items?.reduce((a, i) => a + (i.quantity || 0), 0) || 0,
      gross: Number(s.total || 0).toFixed(2),
      vat: Number(vat || 0).toFixed(2),
      service: Number(service || 0).toFixed(2),
      cash: Number(s.payments?.cash || 0).toFixed(2),
      bank: Number(s.payments?.bank || 0).toFixed(2),
      net: Number(s.finalTotal || (s.total || 0) + (vat || 0) + (service || 0)).toFixed(2),
      status: s.refunded ? 'Refunded' : 'Completed',
    });
    });
    exportToCsv(`sales_${fromDate || 'all'}_${toDate || 'all'}.csv`, rows, [
      { key: 'receipt', header: 'Receipt ID' },
      { key: 'date', header: 'Date' },
      { key: 'user', header: 'User' },
      { key: 'items', header: 'Items' },
      { key: 'gross', header: 'Gross' },
      { key: 'vat', header: 'VAT' },
      { key: 'service', header: 'Service' },
      { key: 'cash', header: 'Cash' },
      { key: 'bank', header: 'Bank' },
      { key: 'net', header: 'Net' },
      { key: 'status', header: 'Status' },
    ]);
  };

  return (
    <div className="mt-24 p-6">
      <Topbar />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" /> Finance Overview
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white border rounded px-2 py-1">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="text-sm outline-none" />
              <span className="text-gray-500 text-sm">to</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="text-sm outline-none" />
            </div>
            <button onClick={onExport} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-3 py-2 rounded flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Export
            </button>
            <button onClick={load} className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-2 rounded flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <>
            <div className="grid grid-cols-6 gap-3 mb-6">
              <Stat title="Gross" value={totals.gross} />
              <Stat title="Total VAT" value={totals.vat} />
              <Stat title="Total Service Fees" value={totals.service} />
              <Stat title="Net" value={totals.net} emphasize />
              <Stat title="Cash" value={totals.cash} />
              <Stat title="Bank" value={totals.bank} />
            </div>

            <div className="bg-white rounded-lg shadow overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <Th>Receipt ID</Th>
                    <Th className="text-right">Cash</Th>
                    <Th className="text-right">Bank</Th>
                    <Th>Date</Th>
                    <Th>User</Th>
                    <Th className="text-right">Items</Th>
                    <Th className="text-right">Gross</Th>
                    <Th className="text-right">VAT (Amount)</Th>
                    <Th className="text-right">Service (Amount)</Th>
                    <Th className="text-right">Net</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s) => {
                    const { vat, service } = deriveAmounts(s);
                    const isExpanded = expandedId === s._id;
                    return (
                      <>
                        <tr key={s._id} className="border-t">
                          <Td>{s.saleNumber ?? '-'}</Td>
                          <Td className="text-right">{Number(s.payments?.cash || 0).toFixed(2)}</Td>
                          <Td className="text-right">{Number(s.payments?.bank || 0).toFixed(2)}</Td>
                          <Td>{new Date(s.createdAt).toLocaleString()}</Td>
                          <Td>{s.user?.username || "-"}</Td>
                          <Td className="text-right">{s.items?.reduce((a, i) => a + (i.quantity || 0), 0) || 0}</Td>
                          <Td className="text-right">{(s.total || 0).toFixed(2)}</Td>
                          <Td className="text-right">{Number(vat || 0).toFixed(2)}</Td>
                          <Td className="text-right">{Number(service || 0).toFixed(2)}</Td>
                          <Td className="text-right font-semibold">{Number(s.finalTotal || (s.total || 0) + (vat || 0) + (service || 0)).toFixed(2)}</Td>
                          <Td>{s.refunded ? "Refunded" : "Completed"}</Td>
                          <Td>
                            <button
                              className="text-blue-600 hover:underline"
                              onClick={() => setExpandedId(isExpanded ? null : s._id)}
                            >
                              {isExpanded ? 'Hide items' : 'View items'}
                            </button>
                          </Td>
                        </tr>
                        {isExpanded ? (
                          <tr key={`${s._id}-items`} className="bg-gray-50 border-t">
                            <td className="px-3 py-2 text-left" colSpan={12}>
                              <div className="text-sm">
                                <div className="font-semibold mb-2">Items in receipt {s.saleNumber ?? '-'}</div>
                                <div className="overflow-auto">
                                  <table className="min-w-full text-xs">
                                <thead>
                                      <tr className="text-gray-600">
                                    <th className="text-left px-2 py-1">Product</th>
                                    <th className="text-left px-2 py-1">SKU</th>
                                        <th className="text-right px-2 py-1">Qty</th>
                                        <th className="text-right px-2 py-1">Price</th>
                                        <th className="text-right px-2 py-1">Line Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {s.items?.map((i, idx) => (
                                        <tr key={idx} className="border-t">
                                      <td className="px-2 py-1">{i.name}</td>
                                      <td className="px-2 py-1">{i.product?.sku ?? '-'}</td>
                                          <td className="px-2 py-1 text-right">{i.quantity}</td>
                                          <td className="px-2 py-1 text-right">{Number(i.price || 0).toFixed(2)}</td>
                                          <td className="px-2 py-1 text-right">{Number((i.price || 0) * (i.quantity || 0)).toFixed(2)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  <div className="text-left">
                                    <div>Subtotal: <span className="font-medium">{Number(s.total || 0).toFixed(2)}</span></div>
                                    <div>VAT: <span className="font-medium">{Number(deriveAmounts(s).vat || 0).toFixed(2)}</span></div>
                                    <div>Service: <span className="font-medium">{Number(deriveAmounts(s).service || 0).toFixed(2)}</span></div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold">Total: {Number(s.finalTotal || 0).toFixed(2)}</div>
                                    <div>Paid Cash: <span className="font-medium">{Number(s.payments?.cash || 0).toFixed(2)}</span></div>
                                    <div>Paid Bank: <span className="font-medium">{Number(s.payments?.bank || 0).toFixed(2)}</span></div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ title, value, emphasize }) {
  return (
    <div className={`p-4 rounded-lg ${emphasize ? "bg-green-50" : "bg-gray-50"}`}>
      <div className="text-xs uppercase text-gray-500">{title}</div>
      <div className={`text-xl font-semibold ${emphasize ? "text-green-700" : "text-gray-900"}`}>
        {Number(value || 0).toFixed(2)}
      </div>
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th className={`text-left px-3 py-2 ${className}`}>{children}</th>
  );
}

function Td({ children, className = "" }) {
  return (
    <td className={`px-3 py-2 ${className}`}>{children}</td>
  );
}


