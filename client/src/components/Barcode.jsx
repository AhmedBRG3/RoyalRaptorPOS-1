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

  const printCode = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return alert("Barcode not ready");

    // Open the window synchronously to avoid popup blockers
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return alert('Popup blocked. Please allow popups to print.');
    printWindow.document.open();
    printWindow.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Preparing…</title></head><body>Preparing label…</body></html>');
    printWindow.document.close();

    // Ensure xmlns for correct serialization
    if (!svgEl.getAttribute("xmlns")) {
      svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    svgEl.setAttribute("shape-rendering", "crispEdges");

    const svgMarkup = svgEl.outerHTML;

    const LABEL_WIDTH_MM = 40;
    const LABEL_HEIGHT_MM = 30;
    const DPI = 600; // Render high-res for crisp printing
    const mmToPx = (mm) => Math.round((mm / 25.4) * DPI);
    const targetWidthPx = mmToPx(LABEL_WIDTH_MM);
    const targetHeightPx = mmToPx(LABEL_HEIGHT_MM);

    // Convert SVG to PNG via an offscreen canvas for broader browser reliability
    const svgBase64 = btoa(unescape(encodeURIComponent(svgMarkup)));
    const svgUrl = `data:image/svg+xml;base64,${svgBase64}`;

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidthPx;
        canvas.height = targetHeightPx;
        const ctx = canvas.getContext('2d');
        // White background to avoid transparency issues on some printers
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Draw scaled to the exact label size
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngDataUrl = canvas.toDataURL('image/png');

        const html = `<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <title>Print Barcode</title>
  <style>
    @page { size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm; margin: 0; }
    html, body { width: ${LABEL_WIDTH_MM}mm; height: ${LABEL_HEIGHT_MM}mm; margin: 0; padding: 0; background: #ffffff; }
    .print-area { width: ${LABEL_WIDTH_MM}mm; height: ${LABEL_HEIGHT_MM}mm; display: flex; align-items: center; justify-content: center; }
    img { width: 100%; height: 100%; object-fit: fill; }
  </style>
  </head>
  <body>
    <div class=\"print-area\"><img src=\"${pngDataUrl}\" /></div>
  </body>
  </html>`;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();

        const triggerPrint = () => {
          try { printWindow.focus(); } catch (_) {}
          try { printWindow.print(); } catch (_) {}
        };
        // Give the new content a moment to layout
        setTimeout(triggerPrint, 200);
      } catch (e) {
        console.error('Print render error', e);
        alert('Failed to render label for printing');
      }
    };
    img.onerror = () => {
      alert('Failed to load barcode image for printing');
    };
    img.src = svgUrl;
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
