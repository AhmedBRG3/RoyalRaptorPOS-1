import { useEffect, useState } from "react";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  login,
} from "../api";
import Topbar from "../components/Topbar";
export default function ProductsAdmin() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    sku: "",
    price: "",
    quantity: "",
    sold: "",
  });
  const [editingId, setEditingId] = useState("");
  const [auth, setAuth] = useState(() =>
    Boolean(
      localStorage.getItem("token") &&
        JSON.parse(localStorage.getItem("user") || "{}")?.admin
    )
  );
  const [creds, setCreds] = useState({
    username: "admin",
    password: "admin123",
    startingBalance: "",
  });
    const [authed, setAuthed] = useState(() => Boolean(localStorage.getItem('token')));

  const logout = () => {
    localStorage.removeItem("token");
    setAuthed(false);
  };

  const load = async () => {
    try {
      setLoading(true);
      const list = await fetchProducts();
      setProducts(list);
    } catch (e) {
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm({ name: "", sku: "", price: "", quantity: "", sold: "" });
    setEditingId("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        price: Number(form.price || 0),
        quantity: Number(form.quantity || 0),
        sold: Number(form.sold || 0),
      };
      if (editingId) {
        await updateProduct(editingId, payload);
      } else {
        await createProduct(payload);
      }
      await load();
      resetForm();
    } catch (err) {
      alert("Save failed");
    }
  };

  const onEdit = (p) => {
    setEditingId(p._id);
    setForm({
      name: p.name,
      sku: p.sku,
      price: p.price,
      quantity: p.quantity ?? 0,
      sold: p.sold ?? 0,
    });
  };

  const onDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
      await load();
    } catch (e) {
      alert("Delete failed");
    }
  };

  if (!auth) {
    return (
      <div style={{ display: "grid", gap: 12, maxWidth: 320 }}>
        <h2>Login</h2>
        <input
          placeholder="Username"
          value={creds.username}
          onChange={(e) => setCreds({ ...creds, username: e.target.value })}
        />
        <input
          placeholder="Password"
          type="password"
          value={creds.password}
          onChange={(e) => setCreds({ ...creds, password: e.target.value })}
        />
        <input
          placeholder="Starting balance"
          type="number"
          min="0"
          step="0.01"
          value={creds.startingBalance}
          onChange={(e) =>
            setCreds({ ...creds, startingBalance: e.target.value })
          }
        />
        <button
          onClick={async () => {
            try {
              await login(
                creds.username,
                creds.password,
                creds.startingBalance
              );
              setAuth(true);
            } catch (e) {
              alert("Login failed");
            }
          }}
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Topbar
        showSearch
        onManageProducts={() => setView("admin")}
        onLogout={authed ? logout : undefined}
      />
      <h2>Products Admin</h2>
      <form
        onSubmit={onSubmit}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr) 120px",
          gap: 8,
          alignItems: "end",
        }}
      >
        <label style={{ display: "grid", gap: 4 }}>
          <span>Name</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>SKU</span>
          <input
            required
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Price</span>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Quantity</span>
          <input
            type="number"
            min="0"
            required
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Sold</span>
          <input
            type="number"
            min="0"
            value={form.sold}
            onChange={(e) => setForm({ ...form, sold: e.target.value })}
          />
        </label>
        <button type="submit">{editingId ? "Update" : "Add"}</button>
      </form>

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
                  borderBottom: "1px solid #ccc",
                  padding: 8,
                }}
              >
                Name
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ccc",
                  padding: 8,
                }}
              >
                SKU
              </th>
              <th
                style={{
                  textAlign: "right",
                  borderBottom: "1px solid #ccc",
                  padding: 8,
                }}
              >
                Price
              </th>
              <th
                style={{
                  textAlign: "right",
                  borderBottom: "1px solid #ccc",
                  padding: 8,
                }}
              >
                Quantity
              </th>
              <th
                style={{
                  textAlign: "right",
                  borderBottom: "1px solid #ccc",
                  padding: 8,
                }}
              >
                Sold
              </th>
              <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id}>
                <td style={{ padding: 8 }}>{p.name}</td>
                <td style={{ padding: 8 }}>{p.sku}</td>
                <td style={{ padding: 8, textAlign: "right" }}>
                  ${p.price.toFixed(2)}
                </td>
                <td style={{ padding: 8, textAlign: "right" }}>
                  {p.quantity ?? 0}
                </td>
                <td style={{ padding: 8, textAlign: "right" }}>
                  {p.sold ?? 0}
                </td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => onEdit(p)} style={{ marginRight: 8 }}>
                    Edit
                  </button>
                  <button onClick={() => onDelete(p._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
