import { useEffect, useState } from "react";
import { fetchSales, refundSale } from "../api";
import Topbar from "../components/Topbar";

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isAdmin = (() => {
    try {
      return !!JSON.parse(localStorage.getItem("user"))?.admin;
    } catch {
      return false;
    }
  })();

  const load = async () => {
    try {
      setLoading(true);
      const list = await fetchSales();
      setSales(list);
    } catch (e) {
      setError("Failed to load sales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefund = async (id) => {
    if (!confirm("Refund this sale?")) return;
    try {
      await refundSale(id);
      await load();
    } catch (e) {
      alert("Refund failed");
    }
  };

  return (
    <div className="p-4 mt-24">
      <Topbar />
      <h2 className="text-2xl font-bold mt-6">Sales</h2>

      {loading ? (
        <p className="mt-4 text-gray-600">Loading…</p>
      ) : error ? (
        <p className="mt-4 text-red-600">{error}</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50">
                <th className="text-left p-2">User</th>
                <th className="text-right p-2">Subtotal</th>
                <th className="text-right p-2">VAT</th>
                <th className="text-right p-2">Service Fee</th>
                <th className="text-right p-2">Final</th>
                <th className="text-left p-2">Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr
                  key={s._id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="p-2">{s.user?.username || "-"}</td>
                  <td className="p-2 text-right">${s.total.toFixed(2)}</td>
                  <td className="p-2 text-right">
                    ${(s.vat || 0).toFixed(2)}
                  </td>
                  <td className="p-2 text-right">
                    ${(s.serviceFee || 0).toFixed(2)}
                  </td>
                  <td className="p-2 text-right">
                    ${s.finalTotal.toFixed(2)}
                  </td>
                  <td className="p-2">
                    {s.refunded ? (
                      <span className="text-red-600 font-semibold">
                        Refunded
                      </span>
                    ) : (
                      <span className="text-green-600 font-semibold">
                        Completed
                      </span>
                    )}
                  </td>
                  <td className="p-2">
                    {isAdmin && !s.refunded && (
                      <button
                        onClick={() => onRefund(s._id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
