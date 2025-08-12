import { useEffect, useMemo, useState, useRef } from "react";
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

  //get all products
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

  // --- scanner detection tuning ---
  const BATCH_PAUSE_MS = 80; // stop of keys -> treat as end of batch
  const MAX_BURST_DURATION_MS = 500; // total time of burst (fast device usually << 500ms)
  const MIN_CHARS_FOR_AUTO = 1; // minimum chars to auto-handle (tweak if too eager)

  // refs for buffering keys
  const bufferRef = useRef("");
  const firstKeyTimeRef = useRef(0);
  const lastKeyTimeRef = useRef(0);
  const timerRef = useRef(null);

  // keep a stable reference to onSearch so listener doesn't need re-registration
  const onSearchRef = useRef();
  useEffect(() => {
    onSearchRef.current = async (e, directValue, fromScanner = false) => {
      e?.preventDefault?.();
      try {
        setLoading(true);
        const searchTerm = directValue ?? q;
        const list = await fetchProducts(searchTerm);
        setProducts(list);

        console.log("scanned list", list);
      } catch (err) {
        setError("Search failed");
      } finally {
        setLoading(false);
      }
    };
  }, [q]);

  // Global key listener for scanner/printer bursts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only accept simple printable keys or Enter (ignore modifiers combos)
      const isPrintable =
        e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
      if (!isPrintable && e.key !== "Enter") return;

      const now = Date.now();

      if (bufferRef.current === "") {
        firstKeyTimeRef.current = now;
      }

      // Append normal printable characters (do not append Enter)
      if (isPrintable) {
        bufferRef.current += e.key;
      }

      lastKeyTimeRef.current = now;

      // reset short pause timer (end of batch when no key for BATCH_PAUSE_MS)
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        processBuffer();
      }, BATCH_PAUSE_MS);

      // If Enter arrives, process immediately (printer often sends Enter at end)
      if (e.key === "Enter") {
        e.preventDefault();
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        processBuffer();
      }
    };

    const processBuffer = () => {
      const buf = (bufferRef.current || "").trim();
      if (!buf) {
        // nothing to do
        bufferRef.current = "";
        firstKeyTimeRef.current = 0;
        lastKeyTimeRef.current = 0;
        return;
      }

      const first = firstKeyTimeRef.current || 0;
      const last = lastKeyTimeRef.current || first;
      const duration = last - first;
      const len = buf.length;
      const avgInterval = len > 1 ? duration / (len - 1) : Infinity;

      // Heuristic: treat as a scanner/printer burst when:
      // - the whole burst is fast (duration small) AND there's at least MIN_CHARS_FOR_AUTO chars,
      //   OR it's a longer burst
      // You can tweak these numbers for your printer/human-typing tradeoff.
      const isScannerBurst =
        (duration <= MAX_BURST_DURATION_MS &&
          len >= MIN_CHARS_FOR_AUTO &&
          (len >= 3 || avgInterval < 80)) ||
        len >= 6;

      if (isScannerBurst) {
        console.log("Scanner/printer burst detected:", {
          buf,
          len,
          duration,
          avgInterval,
        });

        // Find the product and add it to cart
        console.log("products", products);
        const product = products.find((p) => p.sku == buf);
        console.log("buf product", buf);

        console.log("scanned product", product);
        // addToCart(product);
      } else {
        // not a scanner burst — treat as normal typing; do nothing special
      }

      // reset
      bufferRef.current = "";
      firstKeyTimeRef.current = 0;
      lastKeyTimeRef.current = 0;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []); // no deps so it's installed once

  return (
    <div className="flex flex-col mt-24 mx-8">
      <Topbar
        showSearch
        searchValue={q}
        onSearchChange={(e) => setQ(e.target.value)}
        onSearchSubmit={(e) => onSearchRef.current(e)} // form submit uses onSearchRef
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
