import JsBarcode from "jsbarcode";
import { useRef, useEffect, useState } from "react";
import { api } from "../api";

function Barcode({ value }) {
  const svgRef = useRef();
  const [settings, setSettings] = useState({
    labelWidthMm: 35,
    labelHeightMm: 25,
    rotateDegrees: 0,
    hPaddingPct: 0.08,
    vPaddingPct: 0.15,
    dpi: 600,
    forcePortraitPage: false,
    pageOrientation: 'portrait',
    printAsImage: true,
    usbEnabled: false,
    usbVendorId: undefined,
    usbProductId: undefined,
    usbCommandLanguage: 'zpl',
    usbDebugEnabled: false,
    usbTryAllEndpoints: false,
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const usbCacheRef = useRef({ device: null, selected: null });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoadingSettings(true);
      try {
        const { data } = await api.get('/auth/print-settings');
        if (isMounted && data) setSettings((prev) => ({ ...prev, ...data }));
      } catch (_) {
        // ignore; use defaults
      } finally {
        if (isMounted) setLoadingSettings(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    JsBarcode(svgRef.current, value, {
      format: "CODE128",
      lineColor: "#000",
      width: 1,
      height: 20,
      displayValue: true,
      margin: 0,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
    });
  }, [value]);

  async function requestUsbDeviceIfNeeded() {
    if (!navigator.usb) throw new Error('WebUSB is not supported in this browser');
    if (!settings.usbVendorId || !settings.usbProductId) {
      throw new Error('Vendor ID and Product ID are required for USB printing');
    }
    const parseVidPid = (text) => {
      const t = String(text).trim();
      if (/^0x/i.test(t)) return parseInt(t, 16);
      return parseInt(t, 10);
    };
    const vid = parseVidPid(settings.usbVendorId);
    const pid = parseVidPid(settings.usbProductId);

    // Reuse cached if still open
    if (usbCacheRef.current.device && usbCacheRef.current.device.opened) {
      if (settings.usbDebugEnabled) console.log('[USB] Reusing cached device');
      return { device: usbCacheRef.current.device, selected: usbCacheRef.current.selected };
    }

    // Try previously authorized devices to avoid prompt
    const authorized = await navigator.usb.getDevices();
    let device = authorized.find(d => d.vendorId === vid && d.productId === pid);
    if (settings.usbDebugEnabled) console.log('[USB] Authorized devices:', authorized);
    if (!device) {
      // User gesture must trigger this request; this is called inside button handler
      device = await navigator.usb.requestDevice({ filters: [{ vendorId: vid, productId: pid }] });
      if (settings.usbDebugEnabled) console.log('[USB] Requested device:', device?.productName, device);
    }
    await device.open();
    if (settings.usbDebugEnabled) console.log('[USB] Opened device');
    if (device.configuration === null) {
      await device.selectConfiguration(1);
      if (settings.usbDebugEnabled) console.log('[USB] Selected configuration 1');
    }

    // Prefer interfaces: printer class (0x07) > vendor-specific (0xff) > any with bulk OUT
    const scoreAlt = (alt) => {
      const hasBulkOut = (alt.endpoints || []).some(ep => ep.direction === 'out' && ep.type === 'bulk');
      const hasAnyOut = (alt.endpoints || []).some(ep => ep.direction === 'out');
      const cls = alt.interfaceClass;
      let score = 0;
      if (hasBulkOut) score += 10;
      else if (hasAnyOut) score += 5;
      if (cls === 0x07) score += 5;
      if (cls === 0xff) score += 2;
      return score;
    };

    let best = null;
    for (const iface of device.configuration.interfaces) {
      if (settings.usbDebugEnabled) console.log('[USB] Interface', iface.interfaceNumber, iface);
      for (const alt of iface.alternates) {
        if (settings.usbDebugEnabled) console.log('[USB] Alternate', alt.alternateSetting, 'class', alt.interfaceClass, 'endpoints', alt.endpoints);
        const outAny = (alt.endpoints || []).some(ep => ep.direction === 'out');
        if (!outAny) continue;
        const s = scoreAlt(alt);
        if (!best || s > best.score) best = { iface, alt, score: s };
      }
    }
    if (!best) throw new Error('No suitable USB interface with OUT endpoint');
    await device.claimInterface(best.iface.interfaceNumber);
    if (typeof best.alt.alternateSetting === 'number') {
      try { await device.selectAlternateInterface(best.iface.interfaceNumber, best.alt.alternateSetting); } catch (_) {}
    }
    if (settings.usbDebugEnabled) console.log('[USB] Claimed iface', best.iface.interfaceNumber, 'alt', best.alt.alternateSetting);
    // Cache
    usbCacheRef.current = { device, selected: { iface: best.iface, alt: best.alt } };
    return { device, selected: { iface: best.iface, alt: best.alt } };
  }

  function buildZplForValue(v) {
    // Include ^PW and ^LL to set label width/length in dots
    const mmWidth = settings.labelWidthMm * (1 - settings.hPaddingPct);
    const mmHeight = settings.labelHeightMm * (1 - settings.vPaddingPct);
    const pwDots = Math.max(100, Math.round((settings.labelWidthMm / 25.4) * settings.dpi));
    const llDots = Math.max(100, Math.round((settings.labelHeightMm / 25.4) * settings.dpi));
    const moduleWidthDots = Math.max(1, Math.round((mmWidth / 25.4) * settings.dpi / 200));
    const heightDots = Math.round((mmHeight / 25.4) * settings.dpi * 0.8);
    const orientation = settings.rotateDegrees === 90 ? 'R' : settings.rotateDegrees === 180 ? 'I' : settings.rotateDegrees === 270 ? 'B' : 'N';
    const cmds = [
      '^XA',
      '^CI28',
      `^PW${pwDots}`,
      `^LL${llDots}`,
      `^LH0,0`,
      `^BY${moduleWidthDots},3,${heightDots}`,
      `^FO20,20`,
      `^BC${orientation},${heightDots},Y,N,N`,
      `^FD${String(v)}^FS`,
      '^PQ1',
      '^XZ',
    ];
    return cmds.join('\r\n');
  }

  function buildTsplForValue(v) {
    const widthMm = settings.labelWidthMm;
    const heightMm = settings.labelHeightMm;
    const density = Math.round(settings.dpi / 8); // TSPL density scale
    const cmds = [
      'SIZE ' + widthMm + ' mm,' + heightMm + ' mm',
      'GAP 2 mm,0',
      'DENSITY ' + Math.max(0, Math.min(15, density)),
      'DIRECTION 1',
      'CLS',
      // BARCODE x,y,"128",height,readable,rotation,narrow,wide,"content"
      'BARCODE 20,20,"128",120,1,0,2,4,"' + String(v) + '"',
      'PRINT 1,1'
    ];
    return cmds.join('\r\n') + '\r\n';
  }

  function buildEplForValue(v) {
    // EPL: q (dots), Q (label length), N (clear), B (barcode), P (print)
    const widthDots = Math.round((settings.labelWidthMm / 25.4) * settings.dpi);
    const heightDots = Math.round((settings.labelHeightMm / 25.4) * settings.dpi);
    const cmds = [
      'q' + widthDots,
      'Q' + heightDots + ',0',
      'N',
      'B20,20,0,1,3,7,100,B,"' + String(v) + '"',
      'P1'
    ];
    return cmds.join('\r\n') + '\r\n';
  }

  function buildCpclForValue(v) {
    const widthDots = Math.round((settings.labelWidthMm / 25.4) * settings.dpi);
    const heightDots = Math.round((settings.labelHeightMm / 25.4) * settings.dpi);
    const cmds = [
      '! 0 200 200 ' + heightDots + ' 1',
      'PW ' + widthDots,
      'TONE 0',
      'SPEED 5',
      'BARCODE 128 1 1 120 20 20 ' + String(v),
      'PRINT'
    ];
    return cmds.join('\r\n') + '\r\n';
  }

  function buildEscPosForValue(v) {
    // ESC/POS Code128 using GS k m n d1..dn (m=73). Prepend '{B' to select Code Set B.
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const mmWidth = settings.labelWidthMm * (1 - settings.hPaddingPct);
    const moduleWidthDots = Math.max(1, Math.round((mmWidth / 25.4) * settings.dpi / 200));
    // Map dots to ESC/POS module width (2..6 typical)
    let escposWidth = 2;
    if (moduleWidthDots >= 6) escposWidth = 6; else if (moduleWidthDots >= 5) escposWidth = 5; else if (moduleWidthDots >= 4) escposWidth = 4; else if (moduleWidthDots >= 3) escposWidth = 3; else escposWidth = 2;
    const heightDots = clamp(Math.round(((settings.labelHeightMm * (1 - settings.vPaddingPct)) / 25.4) * settings.dpi * 0.8), 1, 255);

    const bytes = [];
    // GS h n (barcode height)
    bytes.push(0x1D, 0x68, heightDots);
    // GS w n (module width)
    bytes.push(0x1D, 0x77, clamp(escposWidth, 2, 6));
    // GS H n (HRI position: 2 = below)
    bytes.push(0x1D, 0x48, 0x02);
    // ESC @ (initialize)
    bytes.push(0x1B, 0x40);
    // Align center for barcode
    bytes.push(0x1B, 0x61, 0x01);

    // Data: '{B' + value, encoded ASCII
    const dataStr = `{B${String(v)}`;
    const encoder = new TextEncoder();
    const dataEncoded = Array.from(encoder.encode(dataStr));
    const n = dataEncoded.length;
    // GS k m n d1..dn  where m=73 (Code128)
    bytes.push(0x1D, 0x6B, 0x49, n, ...dataEncoded);
    // Feed a few lines to ensure barcode is ejected
    bytes.push(0x1B, 0x64, 0x03); // ESC d 3
    return new Uint8Array(bytes);
  }

  function buildEscPosForValueNulTerminated(v) {
    // ESC/POS Code128 using GS k m d1..dn NUL (no length byte)
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const mmWidth = settings.labelWidthMm * (1 - settings.hPaddingPct);
    const moduleWidthDots = Math.max(1, Math.round((mmWidth / 25.4) * settings.dpi / 200));
    let escposWidth = 2;
    if (moduleWidthDots >= 6) escposWidth = 6; else if (moduleWidthDots >= 5) escposWidth = 5; else if (moduleWidthDots >= 4) escposWidth = 4; else if (moduleWidthDots >= 3) escposWidth = 3; else escposWidth = 2;
    const heightDots = clamp(Math.round(((settings.labelHeightMm * (1 - settings.vPaddingPct)) / 25.4) * settings.dpi * 0.8), 1, 255);

    const bytes = [];
    bytes.push(0x1B, 0x40); // ESC @
    bytes.push(0x1B, 0x61, 0x01); // center
    bytes.push(0x1D, 0x68, heightDots); // height
    bytes.push(0x1D, 0x77, clamp(escposWidth, 2, 6)); // width
    bytes.push(0x1D, 0x48, 0x02); // HRI below
    const dataStr = `{B${String(v)}`;
    const encoder = new TextEncoder();
    const dataEncoded = Array.from(encoder.encode(dataStr));
    // GS k m d1..dn NUL (m=73)
    bytes.push(0x1D, 0x6B, 0x49, ...dataEncoded, 0x00);
    bytes.push(0x1B, 0x64, 0x03);
    return new Uint8Array(bytes);
  }

  function buildZplHello() {
    const pwDots = Math.max(100, Math.round((settings.labelWidthMm / 25.4) * settings.dpi));
    const llDots = Math.max(100, Math.round((settings.labelHeightMm / 25.4) * settings.dpi));
    const cmds = [
      '^XA', '^CI28', `^PW${pwDots}`, `^LL${llDots}`, '^LH0,0',
      '^FO50,50^A0N,40,40^FDHELLO^FS', '^PQ1', '^XZ'
    ];
    return cmds.join('\r\n');
  }

  function buildEscposHello() {
    const bytes = [];
    bytes.push(0x1B, 0x40); // init
    bytes.push(0x1B, 0x61, 0x01); // center
    const encoder = new TextEncoder();
    bytes.push(...encoder.encode('HELLO'));
    bytes.push(0x0D, 0x0A);
    bytes.push(0x1B, 0x64, 0x03);
    return new Uint8Array(bytes);
  }

  async function sendUsbData(device, endpointNumber, data) {
    const toBytes = (val) => (val instanceof Uint8Array ? val : new TextEncoder().encode(String(val)));
    const bytes = toBytes(data);
    const chunkSize = 4096;
    let offset = 0;
    while (offset < bytes.length) {
      const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
      const res = await device.transferOut(endpointNumber, chunk);
      if (settings.usbDebugEnabled) console.log('[USB] transferOut', { endpointNumber, chunkLength: chunk.length, status: res.status, bytesWritten: res.bytesWritten });
      if (res.status && res.status !== 'ok') throw new Error(`USB transfer status: ${res.status}`);
      offset += chunk.length;
    }
  }

  async function printOverUsb() {
    const { device, selected } = await requestUsbDeviceIfNeeded();
    const endpoints = (selected.alt.endpoints || []).filter((ep) => ep.direction === 'out');
    if (!endpoints.length) throw new Error('No OUT endpoint found');
    const tryEndpoints = settings.usbTryAllEndpoints ? endpoints : [endpoints.find(ep => ep.type === 'bulk') || endpoints[0]];

    const attempts = [];
    for (const ep of tryEndpoints) {
      try {
        if (settings.usbDebugEnabled) console.log('[USB] Trying endpoint', ep.endpointNumber, 'type', ep.type);
        try { await device.clearHalt('out', ep.endpointNumber); if (settings.usbDebugEnabled) console.log('[USB] clearHalt OK on ep', ep.endpointNumber); } catch (e) { if (settings.usbDebugEnabled) console.warn('[USB] clearHalt error on ep', ep.endpointNumber, e); }
        if (settings.usbCommandLanguage === 'zpl') {
          const zpl = buildZplForValue(value);
          if (settings.usbDebugEnabled) console.log('[USB] Sending ZPL (ep', ep.endpointNumber, ')', zpl);
          await sendUsbData(device, ep.endpointNumber, zpl);
          attempts.push({ ep: ep.endpointNumber, ok: true });
          return;
        }
        if (settings.usbCommandLanguage === 'escpos') {
          const escpos = buildEscPosForValue(value);
          if (settings.usbDebugEnabled) console.log('[USB] Sending ESC/POS (ep', ep.endpointNumber, ') bytes', escpos.length);
          await sendUsbData(device, ep.endpointNumber, escpos);
          attempts.push({ ep: ep.endpointNumber, ok: true });
          return;
        }
        if (settings.usbCommandLanguage === 'tspl') {
          const tspl = buildTsplForValue(value);
          if (settings.usbDebugEnabled) console.log('[USB] Sending TSPL (ep', ep.endpointNumber, ')', tspl);
          await sendUsbData(device, ep.endpointNumber, tspl);
          attempts.push({ ep: ep.endpointNumber, ok: true });
          return;
        }
        if (settings.usbCommandLanguage === 'epl') {
          const epl = buildEplForValue(value);
          if (settings.usbDebugEnabled) console.log('[USB] Sending EPL (ep', ep.endpointNumber, ')', epl);
          await sendUsbData(device, ep.endpointNumber, epl);
          attempts.push({ ep: ep.endpointNumber, ok: true });
          return;
        }
        if (settings.usbCommandLanguage === 'cpcl') {
          const cpcl = buildCpclForValue(value);
          if (settings.usbDebugEnabled) console.log('[USB] Sending CPCL (ep', ep.endpointNumber, ')', cpcl);
          await sendUsbData(device, ep.endpointNumber, cpcl);
          attempts.push({ ep: ep.endpointNumber, ok: true });
          return;
        }
      } catch (e) {
        attempts.push({ ep: ep.endpointNumber, ok: false, error: e?.message || String(e) });
        if (settings.usbDebugEnabled) console.warn('[USB] Endpoint attempt failed', ep.endpointNumber, e);
      }
    }
    throw new Error(`All endpoint attempts failed: ${JSON.stringify(attempts)}`);
  }


  const printCode = async () => {
    if (settings.usbEnabled) {
      try {
        await printOverUsb();
        return;
      } catch (e) {
        console.error('USB print failed', e);
        alert(`USB print failed: ${e.message || e}`);
        // If USB fails, fall back to window print
      }
    }
    // Browser print fallback
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

    // Label configuration
    const LABEL_WIDTH_MM = settings.labelWidthMm;
    const LABEL_HEIGHT_MM = settings.labelHeightMm;
    const ROTATE_DEGREES = settings.rotateDegrees;
    const H_PADDING_PCT = settings.hPaddingPct;
    const V_PADDING_PCT = settings.vPaddingPct;
    const DPI = settings.dpi; // Render high-res for crisp printing
    const mmToPx = (mm) => Math.round((mm / 25.4) * DPI);
    const baseWidthPx = mmToPx(LABEL_WIDTH_MM);
    const baseHeightPx = mmToPx(LABEL_HEIGHT_MM);
    const rotate90or270 = (Math.abs(ROTATE_DEGREES) % 180) === 90;
    // Always render unrotated into a canvas matching the label's natural size
    const targetWidthPx = baseWidthPx;
    const targetHeightPx = baseHeightPx;

    const svgBase64 = btoa(unescape(encodeURIComponent(svgMarkup)));
    const svgUrl = `data:image/svg+xml;base64,${svgBase64}`;

    const img = new Image();
    img.onload = () => {
      try {
        let contentUrl = svgUrl;
        if (settings.printAsImage) {
          const canvas = document.createElement('canvas');
          canvas.width = targetWidthPx;
          canvas.height = targetHeightPx;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const drawW = Math.round(canvas.width * (1 - H_PADDING_PCT));
          const drawH = Math.round(canvas.height * (1 - V_PADDING_PCT));
          const drawX = Math.round((canvas.width - drawW) / 2);
          const drawY = Math.round((canvas.height - drawH) / 2);
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          contentUrl = canvas.toDataURL('image/png');
        }

        // Force a portrait page to discourage PDF auto-rotation; rotate the content via CSS
        const pageWidthMm = Math.min(LABEL_WIDTH_MM, LABEL_HEIGHT_MM);
        const pageHeightMm = Math.max(LABEL_WIDTH_MM, LABEL_HEIGHT_MM);

        const html = `<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <title>Print Barcode</title>
  <style>
    @page { size: ${pageWidthMm}mm ${pageHeightMm}mm; margin: 0; }
    @media print { @page { size: ${settings.pageOrientation}; } }
    html, body { width: ${pageWidthMm}mm; height: ${pageHeightMm}mm; margin: 0; padding: 0; background: #ffffff; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-area { width: ${pageWidthMm}mm; height: ${pageHeightMm}mm; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    img { width: 100%; height: 100%; object-fit: contain; image-orientation: from-image; }
    .rotate { transform: rotate(${ROTATE_DEGREES}deg); transform-origin: center center; }
  </style>
  </head>
  <body>
    <div class=\"print-area\"><img class=\"${ROTATE_DEGREES ? 'rotate' : ''}\" src=\"${contentUrl}\" /></div>
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

  // Editing UI is now handled globally via Topbar modal
  return (
    <div className="flex flex-col gap-2">
      <svg ref={svgRef}></svg>
      <div className="flex gap-2">
        <button
          className="text-sm text-white border bg-blue-600 rounded px-3 py-1"
          onClick={printCode}
          disabled={loadingSettings}
        >
          Print
        </button>
      </div>
    </div>
  );
}

export default Barcode;
