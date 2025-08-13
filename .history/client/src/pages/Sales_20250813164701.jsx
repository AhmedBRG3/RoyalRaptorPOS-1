import { useEffect, useState } from "react";
import { fetchSales, refundSale } from "../api";
import Topbar from "../components/Topbar";
import {
  User,
  DollarSign,
  Percent,
  BadgeDollarSign,
  Receipt,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";

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
      <h2 className="text-2xl font-bold mt-6 mx-12 flex items-center gap-2">
        <Receipt className="w-6 h-6" /> Sales
      </h2>

      {loading ? (
        <p className="mt-4 text-gray-600">Loading…</p>
      ) : error ? (
        <p className="mt-4 text-red-600">{error}</p>
      ) : (
        <div className="mt-6 overflow-x-auto mx-12">
          <table className="w-full border-collapse table-fixed">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-300 bg-gray-50">
                <th className="text-center p-2 w-1/7">
                  <div className="flex items-center gap-1 justify-center">
                    <User className="w-4 h-4" /> User
                  </div>
                </th>
                <th className="text-center p-2 w-1/7">
                  <div className="flex items-center gap-1 justify-center">
                    <DollarSign className="w-4 h-4" /> Subtotal
                  </div>
                </th>
                <th className="text-center p-2 w-1/7">
                  <div className="flex items-center gap-1 justify-center">
                    <Percent className="w-4 h-4" /> VAT (Amount)
                  </div>
                </th>
                <th className="text-center p-2 w-1/7">
                  <div className="flex items-center gap-1 justify-center">
                    <BadgeDollarSign className="w-4 h-4" /> Service (mount)
                  </div>
                </th>
                <th className="text-center p-2 w-1/7">
                  <div className="flex items-center gap-1 justify-center">
                    <Receipt className="w-4 h-4" /> Final
                  </div>
                </th>
                <th className="text-center p-2 w-1/7">
                  <div className="flex items-center gap-1 justify-center">
                    <CheckCircle2 className="w-4 h-4" /> Status
                  </div>
                </th>
                <th className="text-center p-2 w-1/7">
                  <div className="flex items-center gap-1 justify-center">
                    Actions
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr
                  key={s._id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="p-2 w-1/7 text-center">
                    {s.user?.username || "-"}
                  </td>
                  <td className="p-2 w-1/7 text-center">
                    ${s.total.toFixed(2)}
                  </td>
                  <td className="p-2 w-1/7 text-center">
                    {(s.vat || 0).toFixed(2)}
                  </td>
                  <td className="p-2 w-1/7 text-center">
                    {(s.serviceFee || 0).toFixed(2)}
                  </td>
                  <td className="p-2 w-1/7 text-center">
                    {s.finalTotal.toFixed(2)}
                  </td>
                  <td className="p-2 w-1/7 text-center">
                    {s.refunded ? (
                      <span className="text-red-600 font-semibold flex items-center gap-1 justify-center">
                        <XCircle className="w-4 h-4" />
                        Refunded
                      </span>
                    ) : (
                      <span className="text-green-600 font-semibold flex items-center gap-1 justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                        Completed
                      </span>
                    )}
                  </td>
                  <td className="p-2 w-1/7 text-center">
                    {isAdmin && !s.refunded && (
                      <button
                        onClick={() => onRefund(s._id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 flex items-center gap-1 justify-center"
                      >
                        <RotateCcw className="w-4 h-4" />
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
