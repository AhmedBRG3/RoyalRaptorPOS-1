import { useEffect, useState } from "react";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../api";
import Topbar from "../components/Topbar";
import {
  Plus,
  Save,
  Pencil,
  Trash2,
  Package,
  Hash,
  DollarSign,
  Layers,
  ShoppingCart,
  X,
} from "lucide-react";
import Barcode from "../components/Barcode";

export default function ProductsAdmin() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
      setError("");
      const list = await fetchProducts();
      setProducts(list);
    } catch {
      setError("Failed to load products.");
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

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: Number(form.price || 0),
      quantity: Number(form.quantity || 0),
      sold: Number(form.sold || 0),
    };

    try {
      if (editingId) {
        await updateProduct(editingId, payload);
        setProducts((prev) =>
          prev.map((p) => (p._id === editingId ? { ...p, ...payload } : p))
        );
        setSuccess("Product updated successfully.");
      } else {
        const newProduct = await createProduct(payload);
        setProducts((prev) => [...prev, newProduct]);
        setSuccess("Product added successfully.");
      }
      resetForm();
    } catch {
      setError("Save failed. Please try again.");
    } finally {
      setSaving(false);
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
    setError("");
    setSuccess("");
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p._id !== id));
      setSuccess("Product deleted successfully.");
    } catch {
      setError("Delete failed. Please try again.");
    }
  };

  return (
    <div className="mt-24 grid gap-4 p-6">
      <Topbar />

      <h2 className="mb-8 text-2xl font-bold flex items-center gap-2">
        <Package className="w-6 h-6" aria-hidden="true" /> Manage Products
      </h2>

      {error && <p className="text-red-600">{error}</p>}
      {success && <p className="text-green-600">{success}</p>}

      <form
        onSubmit={onSubmit}
        className="grid grid-cols-[repeat(5,minmax(0,1fr))_auto_auto] gap-2 items-end"
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium flex items-center gap-1">
            <Package className="w-4 h-4" aria-hidden="true" /> Name
          </span>
          <input
            required
            value={form.name}
            onChange={handleChange("name")}
            disabled={saving}
            className="border rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium flex items-center gap-1">
            <Hash className="w-4 h-4" aria-hidden="true" /> SKU
          </span>
          <input
            required
            value={form.sku}
            onChange={handleChange("sku")}
            disabled={saving}
            className="border rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium flex items-center gap-1">
            <DollarSign className="w-4 h-4" aria-hidden="true" /> Price
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={form.price}
            onChange={handleChange("price")}
            disabled={saving}
            className="border rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium flex items-center gap-1">
            <Layers className="w-4 h-4" aria-hidden="true" /> Quantity
          </span>
          <input
            type="number"
            min="0"
            required
            value={form.quantity}
            onChange={handleChange("quantity")}
            disabled={saving}
            className="border rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium flex items-center gap-1">
            <ShoppingCart className="w-4 h-4" aria-hidden="true" /> Sold
          </span>
          <input
            type="number"
            min="0"
            value={form.sold}
            onChange={handleChange("sold")}
            disabled={saving}
            className="border rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
        >
          {editingId ? (
            <>
              <Save className="w-4 h-4" aria-hidden="true" /> Update
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" aria-hidden="true" /> Add
            </>
          )}
        </button>

        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            disabled={saving}
            className="bg-gray-500 text-white rounded-md px-4 py-2 hover:bg-gray-600 flex items-center gap-2 disabled:opacity-50"
          >
            <X className="w-4 h-4" aria-hidden="true" /> Cancel
          </button>
        )}
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <table className="mt-6 w-full border-collapse table-fixed">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-center p-2 w-1/6">
                <span className="flex items-center gap-1 justify-center">
                  <Package className="w-4 h-4" aria-hidden="true" /> Name
                </span>
              </th>
              <th className="text-center p-2 w-1/6">
                <span className="flex items-center gap-1 justify-center">
                  <Hash className="w-4 h-4" aria-hidden="true" /> SKU
                </span>
              </th>
              <th className="text-center p-2 w-1/6">
                <span className="flex items-center gap-1 justify-center">
                  <DollarSign className="w-4 h-4" aria-hidden="true" /> Price
                </span>
              </th>
              <th className="text-center p-2 w-1/6">
                <span className="flex items-center gap-1 justify-center">
                  <Layers className="w-4 h-4" aria-hidden="true" /> Quantity
                </span>
              </th>
              <th className="text-center p-2 w-1/6">
                <span className="flex items-center gap-1 justify-center">
                  <ShoppingCart className="w-4 h-4" aria-hidden="true" /> Sold
                </span>
              </th>
              <th className="text-center p-2 w-1/6">
                <span className="flex items-center gap-1 justify-center">
                  <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                  Barcode
                </span>
              </th>
              <th className="text-center p-2 w-1/6">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id} className="border-b">
                <td className="p-2 w-1/6 text-center">{p.name}</td>
                <td className="p-2 w-1/6 text-center">{p.sku}</td>
                <td className="p-2 w-1/6 text-center">
                  ${Number(p.price ?? 0).toFixed(2)}
                </td>
                <td className="p-2 w-1/6 text-center">{p.quantity ?? 0}</td>
                <td className="p-2 w-1/6 text-center">{p.sold ?? 0}</td>
                <td className="p-2 w-1/6 text-center">
                  <Barcode value={p.sku} />
                </td>

                <td className=" p-2 flex items-end justify-start w-1/6 text-center">
                  <button
                    onClick={() => onEdit(p)}
                    disabled={saving}
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Pencil className="w-4 h-4" aria-hidden="true" /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(p._id)}
                    disabled={saving}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" /> Delete
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
