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

  return (
    <div className="flex flex-col">
      <svg ref={svgRef}></svg>
      <button className="text-sm border bg-blue-400 rounded">print</button>
    </div>
  );
}

export default Barcode;
