import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { fetchProducts, createOrder, login } from "./api";
import SalePanel from "./components/SalePanel.jsx";
import Topbar from "./components/Topbar.jsx";
import ProductsAdmin from "./pages/ProductsAdmin.jsx";
import { Package, DollarSign, Hash, Plus, ShoppingCart, Minus, Trash2 } from "lucide-react";

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState([]); // [{ productId, name, price, quantity }]
  const [placing, setPlacing] = useState(false);
  const [lastOrderId, setLastOrderId] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const list = await fetchProducts();
        if (mounted) setProducts(list);
      } catch (e) {
        setError("Failed to load products");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const addToCart = (p) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p._id);
      if (existing) {
        return prev.map((i) =>
          i.productId === p._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        { productId: p._id, name: p.name, price: p.price, quantity: 1 },
      ];
    });
  };

  const updateQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.productId === productId
            ? { ...i, quantity: Math.max(1, i.quantity + delta) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (productId) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const total = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cart]
  );

  const checkout = async () => {
    try {
      setPlacing(true);
      const order = await createOrder(
        cart.map((i) => ({ productId: i.productId, quantity: i.quantity }))
      );
      setLastOrderId(order._id || "");
      setCart([]);
    } catch (e) {
      alert("Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  const [q, setQ] = useState("");
  const onSearch = async (e) => {
    e?.preventDefault?.();
    try {
      setLoading(true);
      const list = await fetchProducts(q);
      setProducts(list);
    } catch {
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col mt-24 mx-8">
      <Topbar
        showSearch
        searchValue={q}
        onSearchChange={(e) => setQ(e.target.value)}
        onSearchSubmit={onSearch}
      />
      <div className="flex gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-2">Products</h2>
          {loading && <p>Loading…</p>}
          {error && <p className="text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-3">
            {products.map((p) => (
              <div
                key={p._id}
                className="border border-gray-200 rounded-lg p-3 w-[200px] bg-white shadow hover:shadow-lg transition-shadow flex flex-col items-center"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-6 h-6 text-blue-500" />
                  <span className="font-semibold text-lg">{p.name}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <Hash className="w-4 h-4" />
                  {p.sku}
                </div>
                <div className="flex items-center gap-1 mt-2 text-xl font-bold text-green-600">
                  <DollarSign className="w-5 h-5" />
                  {p.price.toFixed(2)}
                </div>
                <button
                  className="mt-4 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg flex items-center gap-2 w-full justify-center transition-colors"
                  onClick={() => addToCart(p)}
                >
                  <Plus className="w-4 h-4" />
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className=" w-full max-w-sm">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-blue-500" /> Cart</h2>
          {cart.length === 0 ? (
            <p>No items in cart</p>
          ) : (
            <div className="cart w-500 h-auto border border-gray-500 p-5 rounded-lg shadow-xl bg-white">
              {cart.map((i) => (
                <div
                  key={i.productId}
                  className="flex items-center justify-between gap-2 py-2 border-b border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-semibold w-24">{i.name}</div>
                      <div className="text-xs w-24 text-gray-500 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {i.price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-32 justify-center">
                    <button
                      className="btn bg-blue-400 text-white px-2 rounded-lg flex items-center justify-center"
                      onClick={() => updateQty(i.productId, -1)}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-4 text-center font-bold">{i.quantity}</span>
                    <button
                      className="btn bg-blue-400 text-white px-2 rounded-lg flex items-center justify-center"
                      onClick={() => updateQty(i.productId, 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 font-semibold text-green-700">
                    <DollarSign className="w-4 h-4" />
                    {(i.price * i.quantity).toFixed(2)}
                  </div>
                  <button
                    className="btn text-xs bg-red-400 text-white p-1.5 rounded-xl flex items-center justify-center"
                    onClick={() => removeItem(i.productId)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex justify-between mt-4 font-bold text-lg items-center">
                <span className="flex items-center gap-2"><DollarSign className="w-5 h-5" /> Total</span>
                <span>${total.toFixed(2)}</span>
              </div>

              <SalePanel
                cart={cart}
                setCart={setCart}
                onPlaced={(sale) => alert(`Sale ${sale._id} placed`)}
              />
              {lastOrderId && (
                <p className="text-green-600 mt-2">
                  Order placed: {lastOrderId}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
