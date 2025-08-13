import { useEffect, useState } from "react";
import { fetchUsers, updateUser } from "../api";
import Topbar from "../components/Topbar";
import { User, ShieldCheck, ShieldX, UserCog, Banknote } from "lucide-react";

export default function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const list = await fetchUsers();
      setUsers(list);
    } catch (e) {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleAdmin = async (u) => {
    try {
      await updateUser(u._id, { admin: !u.admin });
      await load();
    } catch (e) {
      alert("Update failed");
    }
  };
  const toggleFinance = async (u) => {
    try {
      await updateUser(u._id, { finance: !u.finance });
      await load();
    } catch (e) {
      alert("Update failed");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Topbar />
      <h2 className="flex items-center gap-2"><UserCog className="w-6 h-6" /> Users</h2>
      {loading ? (
        <p>Loading…</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <table className="mt-24 table-fixed w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className="w-1/5 text-center" style={{ textAlign: "center", padding: 8, borderBottom: "1px solid #ccc" }}>
                <div className="flex items-center gap-1 justify-center">
                  <User className="w-4 h-4" /> Username
                </div>
              </th>
              <th className="w-1/5 text-center" style={{ textAlign: "center", padding: 8, borderBottom: "1px solid #ccc" }}>
                <div className="flex items-center gap-1 justify-center">
                  <ShieldCheck className="w-4 h-4" /> Admin
                </div>
              </th>
              <th className="w-1/5 text-center" style={{ textAlign: "center", padding: 8, borderBottom: "1px solid #ccc" }}>
                <div className="flex items-center gap-1 justify-center">
                  <Banknote className="w-4 h-4" /> Finance
                </div>
              </th>
              <th className="w-2/5 text-center" style={{ textAlign: "center", padding: 8, borderBottom: "1px solid #ccc" }}>
                <div className="flex items-center gap-1 justify-center">
                  Actions
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td className="w-1/5 text-center" style={{ padding: 8, textAlign: "center" }}>{u.username}</td>
                <td className="w-1/5 text-center" style={{ padding: 8, textAlign: "center" }}>
                  {u.admin ? <ShieldCheck className="w-4 h-4 text-green-600 inline" /> : <ShieldX className="w-4 h-4 text-gray-400 inline" />}
                </td>
                <td className="w-1/5 text-center" style={{ padding: 8, textAlign: "center" }}>
                  {u.finance ? <ShieldCheck className="w-4 h-4 text-green-600 inline" /> : <ShieldX className="w-4 h-4 text-gray-400 inline" />}
                </td>
                <td className="w-2/5 text-center" style={{ padding: 8, textAlign: "center" }}>
                  <div className="flex items-center gap-4 justify-center">
                    <button onClick={() => toggleAdmin(u)} className="flex items-center gap-1 justify-center">
                      {u.admin ? <ShieldX className="w-4 h-4 text-red-600" /> : <ShieldCheck className="w-4 h-4 text-green-600" />}
                      {u.admin ? "Revoke Admin" : "Make Admin"}
                    </button>
                    <button onClick={() => toggleFinance(u)} className="flex items-center gap-1 justify-center">
                      {u.finance ? <ShieldX className="w-4 h-4 text-red-600" /> : <ShieldCheck className="w-4 h-4 text-green-600" />}
                      {u.finance ? "Revoke Finance" : "Make Finance"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
