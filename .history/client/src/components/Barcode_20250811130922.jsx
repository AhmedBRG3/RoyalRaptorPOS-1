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
      displayValue: true
    });
  }, [value]);

  return <svg ref={svgRef}></svg>;
}

export default Barcode;
