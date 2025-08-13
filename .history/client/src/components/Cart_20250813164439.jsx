import SalePanel from "./SalePanel.jsx";
import { Package, DollarSign, Plus, Minus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function Cart({ cart = [], setCart, onSaleCompleted, placeSaleRef, cartRef }) {
  const [lastOrderId, setLastOrderId] = useState("");
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {}
  const username = user?.username || "";

  const updateQty = (_id, delta) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i._id === _id
            ? { ...i, quantity: Math.max(1, i.quantity + delta) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (_id) => {
    setCart((prev) => prev.filter((i) => i._id !== _id));
  };

  const total = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cart]
  );

  const printReceipt = (sale) => {
    const date = new Date().toLocaleString();

    // Build the HTML with fixed page size for thermal printer
    const receiptHTML = `
    <html>
      <head>
        <title>Receipt</title>
        <style>
          @page {
            size: auto;
            margin: 0mm;
          }
          body {
            font-family: monospace;
            font-size: 24px;
            margin: 0;
          }
        .receipt {
            left: 0;
            top: 0;
            margin: 0;
            padding: 0;
            transform: scale(0.6);
            page-break-after: avoid;
            page-break-inside: avoid;
            page-break-before: avoid;
            }
          h2, h4 { text-align: center; margin: 0; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 24px; }
          td { padding: 2px 0; }
          .total { font-weight: bold; }
        </style>
      </head>
      <body>
      <div class="receipt">
        <h2>Royal Raptors</h2>
        <h4>Receipt #${username}</h4>
        <div>${date}</div>
        <div class="line"></div>
        <table>
          ${sale.items
            .map(
              (i) => `
              <tr>
                <td>${i.name} x${i.quantity}</td>
                <td style="text-align:right;">$${(i.price * i.quantity).toFixed(
                  2
                )}</td>
              </tr>`
            )
            .join("")}
        </table>
        <div class="line"></div>
        <table>
          <tr>
            <td>Subtotal</td>
            <td style="text-align:right;">$${(sale.subtotal ?? sale.total).toFixed(2)}</td>
          </tr>
          ${typeof sale.vat === 'number' ? `<tr>
            <td>VAT</td>
            <td style="text-align:right;">$${sale.vat.toFixed(2)}</td>
          </tr>` : ''}
          ${typeof sale.serviceFee === 'number' ? `<tr>
            <td>Service Fee</td>
            <td style="text-align:right;">$${sale.serviceFee.toFixed(2)}</td>
          </tr>` : ''}
          <tr>
            <td class="total">Final</td>
            <td class="total" style="text-align:right;">$${(sale.finalTotal ?? sale.total).toFixed(2)}</td>
          </tr>
        </table>
        <div class="line"></div>
        <div style="text-align:center;">Thank you for your purchase!</div>
        </div>
      </body>
    </html>
  `;

    // Open small hidden print window
    const printWin = window.open("", "_blank", "width=600,height=800,left=0,top=0");
    printWin.document.open();
    printWin.document.write(receiptHTML);
    printWin.document.close();

    // Print after fully loaded
    printWin.onload = () => {
      printWin.focus();
      printWin.print();
      printWin.close();
    };

  };

  return (
    <div className="cart w-500 h-auto border border-gray-500 p-5 rounded-lg shadow-xl bg-white">
      {cart.map((i) => (
        <div
          key={i._id}
          className="flex items-center justify-between gap-2 py-2 border-b border-gray-100"
        >
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-400" />
            <div>
              <div className="font-semibold w-24 text-left">{i.name}</div>
              <div className="text-xs w-24 text-gray-500 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {i.price.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-32 justify-center">
            <button
              className="btn bg-blue-400 text-white px-2 rounded-lg flex items-center justify-center"
              onClick={() => updateQty(i._id, -1)}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-4 text-center font-bold">{i.quantity}</span>
            <button
              className="btn bg-blue-400 text-white px-2 rounded-lg flex items-center justify-center"
              onClick={() => updateQty(i._id, 1)}
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
            onClick={() => removeItem(i._id)}
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
        onPlaced={(sale) => {
          setLastOrderId(sale._id);
          printReceipt({
            _id: sale._id,
            items: sale.items?.length ? sale.items : cart,
            subtotal: sale.total,
            vat: sale.vat,
            serviceFee: sale.serviceFee,
            finalTotal: sale.finalTotal,
          });
          onSaleCompleted?.();
        }}
        registerPlaceSale={(fn) => {
          if (placeSaleRef) placeSaleRef.current = fn;
        }}
      />

      {lastOrderId && (
        <p className="text-green-600 mt-2">Order placed: {lastOrderId}</p>
      )}
    </div>
  );
}
