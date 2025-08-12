import SalePanel from "./SalePanel.jsx";
import {
  Package,
  DollarSign,
  Hash,
  Plus,
  ShoppingCart,
  Minus,
  Trash2,
} from "lucide-react";

export default function Cart({ cart = [], setCart }) {
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

  return (
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
        <span className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" /> Total
        </span>
        <span>${total.toFixed(2)}</span>
      </div>

      <SalePanel
        cart={cart}
        setCart={setCart}
        onPlaced={(sale) => alert(`Sale ${sale._id} placed`)}
      />
      {lastOrderId && (
        <p className="text-green-600 mt-2">Order placed: {lastOrderId}</p>
      )}
    </div>
  );
}
