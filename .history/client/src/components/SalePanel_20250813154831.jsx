import { useEffect, useMemo, useState } from 'react';
import { createSale } from '../api';
import { Receipt, Percent, BadgeDollarSign, ShoppingCart } from "lucide-react";

export default function SalePanel({ cart, setCart, onPlaced, registerPlaceSale }) {
  const [vat, setVat] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [placing, setPlacing] = useState(false);

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
  const vatPct = Number(vat || 0);
  const servicePct = Number(serviceFee || 0);
  const vatAmount = subtotal * (isNaN(vatPct) ? 0 : vatPct / 100);
  const serviceAmount = subtotal * (isNaN(servicePct) ? 0 : servicePct / 100);
  const finalTotal = subtotal + vatAmount + serviceAmount;

  const placeSale = async () => {
    try {
      setPlacing(true);
      const sale = await createSale({
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        // Send percentages; server will compute and store amounts
        vat: vatPct,
        serviceFee: servicePct,
      });
      setCart([]);
      onPlaced?.(sale);
    } catch (e) {
      const message = e?.response?.data?.message || 'Sale failed';
      alert(message);
    } finally {
      setPlacing(false);
    }
  };

  // Allow parent to trigger placing the sale via Enter key when not scanning
  useEffect(() => {
    if (typeof registerPlaceSale === 'function') {
      const handler = () => {
        if (!placing && cart.length > 0) {
          placeSale();
        }
      };
      registerPlaceSale(handler);
      return () => registerPlaceSale(null);
    }
  }, [registerPlaceSale, placing, cart.length]);

  return (
    <div style={{ borderTop: '1px solid #eee', marginTop: 12, paddingTop: 12 }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <label className="flex items-center gap-2">
          <Percent className="w-4 h-4 text-blue-500" />
          VAT (%): <input type="number" step="0.01" value={vat} onChange={(e) => setVat(e.target.value)} style={{ width: 100 }} />
        </label>
        <label className="flex items-center gap-2">
          <BadgeDollarSign className="w-4 h-4 text-green-500" />
          Service fee (%): <input type="number" step="0.01" value={serviceFee} onChange={(e) => setServiceFee(e.target.value)} style={{ width: 100 }} />
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontWeight: 700 }}>
        <span className="flex items-center gap-1"><Receipt className="w-4 h-4 text-gray-700" /> Final total</span>
        <span>${finalTotal.toFixed(2)}</span>
      </div>
      <button type="button" className='bg-blue-500 rounded-xl text-white p-4 flex items-center gap-2' style={{ marginTop: 8 }} disabled={placing || cart.length === 0} onClick={placeSale}>
        <ShoppingCart className="w-5 h-5" />
        {placing ? 'Placing…' : 'Place Sale'}
      </button>
    </div>
  );
}


