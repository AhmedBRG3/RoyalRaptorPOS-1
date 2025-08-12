import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { fetchProducts, createOrder, login } from "./api";
import SalePanel from "./components/SalePanel.jsx";
import Topbar from "./components/Topbar.jsx";
import ProductsAdmin from "./pages/ProductsAdmin.jsx";

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
                className="border border-gray-200 rounded-lg p-3 w-[180px]"
              >
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-gray-500">{p.sku}</div>
                <div className="mt-2">${p.price.toFixed(2)}</div>
                <button
                  className="mt-2 btn bg-blue-500 text-white p-2 rounded-lg"
                  onClick={() => addToCart(p)}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-semibold mb-2">Cart</h2>
          {cart.length === 0 ? (
            <p>No items in cart</p>
          ) : (
            <div className="cart w-500 h-auto border border-gray-500 p-5 rounded-lg shadow-xl">
              {cart.map((i) => (
                <div
                  key={i.productId}
                  className="flex items-center justify-between gap-2 py-2 border-b border-gray-100"
                >
                  <div>
                    <div className="font-semibold w-24">{i.name}</div>
                    <div className="text-xs w-24 text-gray-500">
                      ${i.price.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-48">
                    <button
                      className="btn bg-blue-400 text-white px-2 rounded-lg"
                      onClick={() => updateQty(i.productId, -1)}
                    >
                      -
                    </button>
                    <span className="w-4">{i.quantity}</span>
                    <button
                      className="btn btn bg-blue-400 text-white px-2 rounded-lg"
                      onClick={() => updateQty(i.productId, 1)}
                    >
                      +
                    </button>
                  </div>
                  <div>${(i.price * i.quantity).toFixed(2)}</div>
                  <button
                    className="btn text-xs bg-red-400 text-white p-1.5 rounded-xl"
                    onClick={() => removeItem(i.productId)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="flex justify-between mt-4 font-bold">
                <span>Total</span>
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
