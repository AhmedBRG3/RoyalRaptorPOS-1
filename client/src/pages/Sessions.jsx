import { useEffect, useState } from "react";
import { fetchSessions } from "../api";
import Topbar from "../components/Topbar";
import { User, Clock, DollarSign, CheckCircle2, XCircle, Receipt, Download } from "lucide-react";
import { exportToCsv } from "../utils/exportCsv";

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

  const handleExport = () => {
    const exportData = sessions.map(session => {
      const totalItems = (session.sales || []).filter(sl => !sl.refunded).reduce((a, sl) => a + (sl.items || []).reduce((ci, i) => ci + (i.quantity || 0), 0), 0);
      const totalRevenue = (session.sales || []).filter(sl => !sl.refunded).reduce((a, sl) => a + Number(sl.finalTotal || 0), 0);
      
      return {
        username: session.user?.username || 'Unknown',
        startTime: new Date(session.startTime).toLocaleString(),
        endTime: session.endTime ? new Date(session.endTime).toLocaleString() : 'Open',
        startingCash: Number(session.startingCash || 0).toFixed(2),
        startingBank: Number(session.startingBank || 0).toFixed(2),
        endingCash: Number(session.endingCash || 0).toFixed(2),
        endingBank: Number(session.endingBank || 0).toFixed(2),
        totalSales: session.sales?.length || 0,
        totalItems: totalItems,
        totalRevenue: totalRevenue.toFixed(2),
        status: session.endTime ? 'Closed' : 'Open'
      };
    });

    const columns = [
      { key: 'username', header: 'User' },
      { key: 'startTime', header: 'Start Time' },
      { key: 'endTime', header: 'End Time' },
      { key: 'startingCash', header: 'Starting Cash' },
      { key: 'startingBank', header: 'Starting Bank' },
      { key: 'endingCash', header: 'Ending Cash' },
      { key: 'endingBank', header: 'Ending Bank' },
      { key: 'totalSales', header: 'Total Sales' },
      { key: 'totalItems', header: 'Total Items' },
      { key: 'totalRevenue', header: 'Total Revenue' },
      { key: 'status', header: 'Status' }
    ];

    exportToCsv('sessions-export.csv', exportData, columns);
  };

  return (
    <div className="p-4">
      <Topbar />
      <div className="mt-16 flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6" /> Sessions
        </h2>
        <button
          onClick={handleExport}
          disabled={loading || sessions.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

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
                  <div className="font-semibold text-lg flex items-center gap-1">
                    <User className="w-4 h-4" />
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
                  <div className="font-medium flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    Starting Cash: ${Number(s.startingCash || 0).toFixed(2)} | Starting Bank: ${Number(s.startingBank || 0).toFixed(2)}
                  </div>
                  <div className="font-medium flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    Ending Cash: ${Number(s.endingCash || 0).toFixed(2)} | Ending Bank: ${Number(s.endingBank || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Sales Table */}
              <table className="w-full border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="w-1/3 text-center p-2 text-sm font-medium text-gray-600">
                      <div className="flex items-center gap-1 justify-center">
                        <Receipt className="w-4 h-4" /> Items
                      </div>
                    </th>
                    <th className="w-1/3 text-center p-2 text-sm font-medium text-gray-600">
                      <div className="flex items-center gap-1 justify-center">
                        <DollarSign className="w-4 h-4" /> Final Total
                      </div>
                    </th>
                    <th className="w-1/3 text-center p-2 text-sm font-medium text-gray-600">
                      <div className="flex items-center gap-1 justify-center">
                        <CheckCircle2 className="w-4 h-4" /> Status
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(s.sales || []).map((sale) => (
                    <tr
                      key={sale._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="w-1/3 text-center p-2 text-sm">{(sale.items || []).reduce((a, i) => a + (i.quantity || 0), 0)}</td>
                      <td className="w-1/3 text-center p-2 text-sm">
                        ${Number(sale.finalTotal).toFixed(2)}
                      </td>
                      <td
                        className={`w-1/3 text-center p-2 text-sm font-medium ${
                          sale.refunded
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {sale.refunded ? <> Refunded</> : <>Completed</>}
                      </td>
                    </tr>
                  ))}
                  {(s.sales || []).length > 0 && (
                    <tr className="border-t border-gray-200 font-semibold">
                      <td className="w-1/3 text-center p-2 text-sm">
                        {(s.sales || []).filter(sl => !sl.refunded).reduce((a, sl) => a + (sl.items || []).reduce((ci, i) => ci + (i.quantity || 0), 0), 0)}
                      </td>
                      <td className="w-1/3 text-center p-2 text-sm">
                        ${((s.sales || []).filter(sl => !sl.refunded).reduce((a, sl) => a + Number(sl.finalTotal || 0), 0)).toFixed(2)}
                      </td>
                      <td className="w-1/3 text-center p-2 text-sm"></td>
                    </tr>
                  )}
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
