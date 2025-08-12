import { useEffect, useState } from "react";
import { fetchUsers, updateUser } from "../api";
import Topbar from "../components/Topbar";

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

  return (
    <div style={{ padding: 16 }}>
      <Topbar />
      <h2>Users</h2>
      {loading ? (
        <p>Loading…</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: 8,
                  borderBottom: "1px solid #ccc",
                }}
              >
                Username
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: 8,
                  borderBottom: "1px solid #ccc",
                }}
              >
                Admin
              </th>
              <th style={{ padding: 8, borderBottom: "1px solid #ccc" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td style={{ padding: 8 }}>{u.username}</td>
                <td style={{ padding: 8 }}>{u.admin ? "Yes" : "No"}</td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => toggleAdmin(u)}>
                    {u.admin ? "Revoke Admin" : "Make Admin"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
