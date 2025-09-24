import SalePanel from "./SalePanel.jsx";
import { Package, DollarSign, Plus, Minus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function Cart({
  cart = [],
  setCart,
  onSaleCompleted,
  placeSaleRef,
}) {
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

  const updatePrice = (_id, price) => {
    setCart((prev) =>
      prev.map((i) =>
        i._id === _id
          ? {
              ...i,
              // Determine ceiling as original/base price; fallback to current when unknown
              price: (() => {
                const ceiling = typeof i.originalPrice === 'number'
                  ? i.originalPrice
                  : (typeof i.basePrice === 'number' ? i.basePrice : i.price);
                const floor = typeof i.minPrice === 'number' ? i.minPrice : 0;
                const requested = Number(price || 0);
                return Math.max(floor, Math.min(ceiling, requested));
              })(),
              originalPrice: typeof i.originalPrice === 'number' ? i.originalPrice : (typeof i.basePrice === 'number' ? i.basePrice : i.price)
            }
          : i
      )
    );
  };

  const total = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cart]
  );

  const printReceipt = (sale) => {
    const date = new Date().toLocaleString();
    console.log(sale);

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
                <td>${i.name} - ${i.sku}</td>
                <td style="text-align:right;">
                  ${
                    Number((i.originalPrice ?? i.basePrice ?? i.price) || 0) !== Number(i.price || 0)
                      ? `<span style="text-decoration: line-through;">$${Number(i.originalPrice ?? i.basePrice ?? i.price).toFixed(2)}</span>
                         ${Number(i.price).toFixed(2)} × ${Number(i.quantity)} = ${(Number(i.price) * Number(i.quantity)).toFixed(2)}`
                      : `${Number(i.price).toFixed(2)} × ${Number(i.quantity)} = ${(Number(i.price) * Number(i.quantity)).toFixed(2)}`
                  }
                </td>
              </tr>`
            )
            .join("")}
        </table>
        <div class="line"></div>
        <table>
          <tr>
            <td>Subtotal</td>
            <td style="text-align:right;">${(
              sale.subtotal ?? sale.total
            ).toFixed(2)}</td>
          </tr>
          ${
            typeof sale.vat === "number"
              ? `<tr>
            <td>VAT</td>
            <td style="text-align:right;">${sale.vat.toFixed(2)}</td>
          </tr>`
              : ""
          }
          ${
            typeof sale.serviceFee === "number"
              ? `<tr>
            <td>Service Fee</td>
            <td style="text-align:right;">${sale.serviceFee.toFixed(2)}</td>
          </tr>`
              : ""
          }
          <tr>
            <td class="total">Final</td>
            <td class="total" style="text-align:right;">${(
              sale.finalTotal ?? sale.total
            ).toFixed(2)}</td>
          </tr>
          ${typeof sale.payments?.cash === 'number' || typeof sale.payments?.bank === 'number' ? `
          <tr>
            <td>Paid Cash</td>
            <td style="text-align:right;">${Number(sale.payments?.cash || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Paid Bank</td>
            <td style="text-align:right;">${Number(sale.payments?.bank || 0).toFixed(2)}</td>
          </tr>` : ''}
        </table>
        <div class="line"></div>
        <table>
          <tr>
            <td>Sale No.</td>
            <td style="text-align:right;">${sale.saleNumber ?? ''}</td>
          </tr>
        </table>
        <div style="text-align:center;">Thank you for your purchase!</div>
        </div>
      </body>
    </html>
  `;

    // Open small hidden print window
    const printWin = window.open(
      "",
      "_blank",
      "width=600,height=800,left=0,top=0"
    );
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
                {typeof i.originalPrice === 'number' && i.price !== i.originalPrice ? (
                  <>
                    <span className="line-through">{Number(i.originalPrice).toFixed(2)}</span>
                    <span className="ml-1 text-gray-900">{Number(i.price).toFixed(2)}</span>
                  </>
                ) : (
                  <span>{Number(i.price).toFixed(2)}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 w-32 justify-center">
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
          <div className="flex items-center gap-3 ">
            <div className="flex flex-col items-center gap-2">
              <button
                className="btn bg-gray-200 text-black rounded-lg"
                onClick={() => updatePrice(i._id, Math.max((typeof i.minPrice === 'number' ? i.minPrice : 0), Number(i.price) - 1))}
                disabled={typeof i.minPrice === 'number' && Number(i.price) <= i.minPrice}
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="text-center font-semibold">
                ${Number(i.price).toFixed(2)}
              </div>
              <button
                className="btn bg-gray-200 text-black rounded-lg"
                onClick={() => {
                  const ceiling = typeof i.originalPrice === 'number' ? i.originalPrice : (typeof i.basePrice === 'number' ? i.basePrice : i.price);
                  updatePrice(i._id, Math.min(ceiling, Number(i.price) + 1));
                }}
                disabled={(typeof i.originalPrice === 'number' ? Number(i.price) >= i.originalPrice : (typeof i.basePrice === 'number' ? Number(i.price) >= i.basePrice : false))}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-gray-500 whitespace-nowrap">
              {(typeof i.minPrice === 'number') && <span>Min ${Number(i.minPrice).toFixed(2)}</span>}
              {(typeof i.minPrice === 'number') && <span> · </span>}
              <span>Max ${Number(typeof i.originalPrice === 'number' ? i.originalPrice : (typeof i.basePrice === 'number' ? i.basePrice : i.price)).toFixed(2)}</span>
            </div>
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
            saleNumber: sale.saleNumber,
            items: sale.items?.length ? sale.items : cart,
            subtotal: sale.total,
            vat: sale.vat,
            serviceFee: sale.serviceFee,
            finalTotal: sale.finalTotal,
            payments: sale.payments,
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
