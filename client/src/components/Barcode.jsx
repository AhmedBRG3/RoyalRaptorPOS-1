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
      // Serialize current SVG to a compact data URL (SVG). Backend will rasterize/normalize.
      const svgEl = svgRef.current;
      if (!svgEl) throw new Error("Barcode SVG not ready");
      // Ensure xmlns for correct SVG serialization
      if (!svgEl.getAttribute("xmlns")) {
        svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const base64 = btoa(unescape(encodeURIComponent(svgString)));
      const imageDataUrl = `data:image/svg+xml;base64,${base64}`;

      const res = await fetch("http://localhost:5050/api/barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value, image: imageDataUrl }),
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
      <button
        className="text-sm text-white border bg-blue-400 rounded"
        onClick={printCode}
      >
        Print
      </button>
    </div>
  );
}

export default Barcode;
