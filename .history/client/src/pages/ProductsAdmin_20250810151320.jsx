import { useEffect, useState } from "react";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
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

  return (
    <div className="mt-24 grid gap-4 p-6">
      <Topbar />
      <h2 className="mb-12 text-2xl font-bold">Add Products</h2>

      <form
        onSubmit={onSubmit}
        className="grid grid-cols-[repeat(5,minmax(0,1fr))_120px] gap-2 items-end"
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Name</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">SKU</span>
          <input
            required
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            className="border rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Price</span>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="border rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Quantity</span>
          <input
            type="number"
            min="0"
            required
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            className="border rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Sold</span>
          <input
            type="number"
            min="0"
            value={form.sold}
            onChange={(e) => setForm({ ...form, sold: e.target.value })}
            className="border rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <button
          type="submit"
          className="bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700"
        >
          {editingId ? "Update" : "Add"}
        </button>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <table className="mt-6 w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">SKU</th>
              <th className="text-right p-2">Price</th>
              <th className="text-right p-2">Quantity</th>
              <th className="text-right p-2">Sold</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id} className="border-b">
                <td className="p-2">{p.name}</td>
                <td className="p-2">{p.sku}</td>
                <td className="p-2 text-right">${p.price.toFixed(2)}</td>
                <td className="p-2 text-right">{p.quantity ?? 0}</td>
                <td className="p-2 text-right">{p.sold ?? 0}</td>
                <td className="p-2 space-x-2">
                  <button
                    onClick={() => onEdit(p)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(p._id)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    Delete
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
