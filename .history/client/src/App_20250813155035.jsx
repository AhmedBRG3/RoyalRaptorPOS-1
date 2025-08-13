import { useEffect, useRef, useState } from "react";
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
import { use } from "react";
function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState([]); // [{ productId, name, price, quantity }]
  console.error(
    "THIS APP IS MADE BY OMAR ALHUSSENI, IG @omaralhusseni, omar.alhusseni@icloud.com"
  );
  console.warn(
    "THIS APP IS MADE BY OMAR ALHUSSENI, IG @omaralhusseni, omar.alhusseni@icloud.com"
  );
  console.log(
    "THIS APP IS MADE BY OMAR ALHUSSENI, IG @omaralhusseni, omar.alhusseni@icloud.com"
  );
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

  const cartRef = useRef([]);

  const addToCart = (p) => {
    if (!p) return;

    // Block adding items that are out of stock
    if ((p.quantity ?? 0) <= 0) {
      alert(`${p.name} is out of stock`);
      return;
    }

    // Find if it exists in our ref cart (not the state)
    const existing = cartRef.current.find(
      (i) => String(i.productId) === String(p._id)
    );

    if ((p.quantity ?? 0) < 5) {
      alert(`Low stock: Only ${p.quantity ?? 0} left for ${p.name}`);
    }
    console.log(
      "Adding:",
      String(p._id),
      "Cart IDs:",
      cartRef.current.map((i) => String(i.productId))
    );
    let updatedCart;
    if (existing) {
      updatedCart = cartRef.current.map((i) =>
        String(i.productId) === String(p._id)
          ? { ...i, quantity: i.quantity + 1 }
          : i
      );
    } else {
      updatedCart = [
        ...cartRef.current,
        { ...p, productId: p._id, quantity: 1 },
      ];
    }

    // Update both the ref and the state
    cartRef.current = updatedCart;
    setCart(updatedCart);
  };

  useEffect(() => {
    console.log("Cart", cart);
  }, [cart]);
  const [q, setQ] = useState("");
  const placeSaleRef = useRef(null);
  const refreshProducts = async () => {
    try {
      const list = await fetchProducts(q);
      setProducts(list);
    } catch (e) {
      // ignore refresh errors silently
    }
  };
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

  const productsRef = useRef(products);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    let buffer = "";
    let lastTime = Date.now();

    const handleKeyDown = (e) => {
      const now = Date.now();
      if (now - lastTime > 50) buffer = "";
      lastTime = now;

      if (e.key === "Enter") {
        if (buffer) {
          console.log("Scanned barcode:", buffer);
          console.log(productsRef.current); // always latest value
          const found = productsRef.current.find((p) => p.sku == buffer);
          if (found) {
            console.log("found", found);
            addToCart({ ...found });
          } else {
            alert(`No product found for barcode: ${buffer}`);
          }
          // prevent focused element from receiving implicit click on Enter
          e.preventDefault();
          e.stopPropagation();
          try {
            document.activeElement &&
              document.activeElement.blur &&
              document.activeElement.blur();
          } catch {}
        } else {
          // If Enter is pressed without a scanner buffer, attempt to place the sale
          if (placeSaleRef.current) {
            e.preventDefault();
            e.stopPropagation();
            try {
              document.activeElement &&
                document.activeElement.blur &&
                document.activeElement.blur();
            } catch {}
            placeSaleRef.current();
          }
        }
        buffer = "";
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="flex flex-col mt-24 mx-8 pb-24">
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
                  <span className="font-semibold text-lg text-ellipsis text-pretty">
                    {p.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <Hash className="w-4 h-4" />
                  {p.sku}
                </div>
                <div className="text-xs text-gray-500">
                  Qty: {p.quantity ?? 0}
                </div>
                <div className="flex items-center gap-1 mt-2 text-xl font-bold text-green-600">
                  <DollarSign className="w-5 h-5" />
                  {p.price.toFixed(2)}
                </div>
                <button
                  type="button"
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
            <Cart
              cart={cart}
              setCart={setCart}
              onSaleCompleted={refreshProducts}
              placeSaleRef={placeSaleRef}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
