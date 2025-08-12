import { useEffect, useState } from "react";
import { fetchSessions } from "../api";
import Topbar from "../components/Topbar";

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const list = await fetchSessions();
      setSessions(list);
    } catch (e) {
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-4">
      <Topbar />
      <h2 className="mt-16 text-2xl font-bold">Sessions</h2>

      {loading ? (
        <p className="mt-6 text-gray-500">Loading…</p>
      ) : error ? (
        <p className="mt-6 text-red-600">{error}</p>
      ) : (
        <div className="mt-8 grid gap-6">
          {sessions.map((s) => (
            <div
              key={s._id}
              className="border border-gray-200 rounded-lg p-4 shadow-sm bg-white"
            >
              {/* Session Header */}
              <div className="flex justify-between mb-3">
                <div>
                  <div className="font-semibold text-lg">
                    {s.user?.username}
                  </div>
                  <div className="text-gray-500 text-sm">
                    Start: {new Date(s.startTime).toLocaleString()} • End:{" "}
                    {s.endTime
                      ? new Date(s.endTime).toLocaleString()
                      : "Open"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    Starting: ${Number(s.startingBalance).toFixed(2)}
                  </div>
                  <div className="font-medium">
                    Ending: ${Number(s.endingBalance).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Sales Table */}
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-2 text-sm font-medium text-gray-600">
                      Sale ID
                    </th>
                    <th className="text-right p-2 text-sm font-medium text-gray-600">
                      Final Total
                    </th>
                    <th className="text-left p-2 text-sm font-medium text-gray-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(s.sales || []).map((sale) => (
                    <tr
                      key={sale._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-2 text-sm">{sale._id}</td>
                      <td className="p-2 text-sm text-right">
                        ${Number(sale.finalTotal).toFixed(2)}
                      </td>
                      <td
                        className={`p-2 text-sm font-medium ${
                          sale.refunded
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {sale.refunded ? "Refunded" : "Completed"}
                      </td>
                    </tr>
                  ))}
                  {(s.sales || []).length === 0 && (
                    <tr>
                      <td
                        colSpan="3"
                        className="p-3 text-center text-sm text-gray-400"
                      >
                        No sales in this session
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
