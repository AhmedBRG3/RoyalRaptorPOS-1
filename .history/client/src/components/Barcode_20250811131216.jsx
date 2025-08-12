import JsBarcode from "jsbarcode";
import { useRef, useEffect } from "react";

function Barcode({ value }) {
  const svgRef = useRef();

  useEffect(() => {
    JsBarcode(svgRef.current, value, {
      format: "CODE128",
      lineColor: "#000",
      width: 1,
      height: 20,
      displayValue: true,
    });
  }, [value]);

  const printCode = async () => {
    try {
      const res = await fetch("http://localhost:5050/print-barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (res.ok) {
        alert("Print job sent!");
      } else {
        alert("Failed to print");
      }
    } catch (err) {
      console.error(err);
      alert("Error printing");
    }
  };
  return (
    <div className="flex flex-col">
      <svg ref={svgRef}></svg>
      <button className="text-sm text-white border bg-blue-400 rounded" onc>
        Print
      </button>
    </div>
  );
}

export default Barcode;
