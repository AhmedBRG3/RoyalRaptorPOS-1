import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { fetchProducts, createOrder, login } from "./api";
import Topbar from "./components/Topbar.jsx";
import {
  Package,
  DollarSign,
  Hash,
  Plus,
  ShoppingCart,
  Minus,
  Trash2,
} from "lucide-react";
import Cart from "./components/Cart.jsx";
function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState([]); // [{ productId, name, price, quantity }]

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

  useEffect(() => {
    const keystrokeCount = { value: 0 };
    let timer = null;

    const handleKeyDown = (e) => {
      keystrokeCount.value++;

      if (!timer) {
        timer = setTimeout(() => {
          keystrokeCount.value = 0;
          timer = null;
        }, 500);
      }

      if (keystrokeCount.value > 6) {
        e.preventDefault();
        console.log("Blocked fast input:", e.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);
  
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
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-500" /> Cart
          </h2>
          {cart.length === 0 ? (
            <p>No items in cart</p>
          ) : (
            <Cart cart={cart} setCart={setCart} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
