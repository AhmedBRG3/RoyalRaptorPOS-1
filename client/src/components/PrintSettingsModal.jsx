import { useEffect, useState } from "react";
import { api } from "../api";

export default function PrintSettingsModal({ open, onClose }) {
  const [settings, setSettings] = useState({
    labelWidthMm: 35,
    labelHeightMm: 25,
    rotateDegrees: 0,
    hPaddingPct: 0.04,
    vPaddingPct: 0.08,
    dpi: 600,
    forcePortraitPage: false,
    pageOrientation: 'portrait',
    printAsImage: true,
    usbEnabled: false,
    usbVendorId: '',
    usbProductId: '',
    usbCommandLanguage: 'zpl',
    usbDebugEnabled: false,
    usbTryAllEndpoints: false,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (open) {
      (async () => {
        setLoading(true);
        try {
          const { data } = await api.get("/auth/print-settings");
          if (mounted && data) setSettings((prev) => ({ ...prev, ...data }));
        } catch (e) {
          // ignore
        } finally {
          if (mounted) setLoading(false);
        }
      })();
    }
    return () => { mounted = false; };
  }, [open]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((s) => {
      if (type === 'checkbox') return { ...s, [name]: checked };
      if (name === 'usbVendorId' || name === 'usbProductId') return { ...s, [name]: value };
      return {
        ...s,
        [name]: name.includes('Pct') ? parseFloat(value) : parseInt(value, 10),
      };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/auth/print-settings", settings);
      onClose?.();
    } catch (e) {
      console.error(e);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-[520px] max-w-full p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Print Settings</h2>
          <button onClick={onClose} className="px-2 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200">Close</button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="flex items-center gap-2">Width (mm)
              <input name="labelWidthMm" type="number" min="10" max="100" value={settings.labelWidthMm} onChange={handleChange} className="border px-2 py-1 rounded w-28" />
            </label>
            <label className="flex items-center gap-2">Height (mm)
              <input name="labelHeightMm" type="number" min="10" max="100" value={settings.labelHeightMm} onChange={handleChange} className="border px-2 py-1 rounded w-28" />
            </label>
            <label className="flex items-center gap-2">Rotate
              <select name="rotateDegrees" value={settings.rotateDegrees} onChange={handleChange} className="border px-2 py-1 rounded w-28">
                <option value={0}>0°</option>
                <option value={90}>90°</option>
                <option value={180}>180°</option>
                <option value={270}>270°</option>
              </select>
            </label>
            <label className="flex items-center gap-2">H padding (0-0.5)
              <input step="0.01" name="hPaddingPct" type="number" min="0" max="0.5" value={settings.hPaddingPct} onChange={handleChange} className="border px-2 py-1 rounded w-28" />
            </label>
            <label className="flex items-center gap-2">V padding (0-0.5)
              <input step="0.01" name="vPaddingPct" type="number" min="0" max="0.5" value={settings.vPaddingPct} onChange={handleChange} className="border px-2 py-1 rounded w-28" />
            </label>
            <label className="flex items-center gap-2">DPI
              <input name="dpi" type="number" min="150" max="1200" step="50" value={settings.dpi} onChange={handleChange} className="border px-2 py-1 rounded w-28" />
            </label>
            <label className="flex items-center gap-2 col-span-2">
              <input name="forcePortraitPage" type="checkbox" checked={!!settings.forcePortraitPage} onChange={(e) => setSettings(s => ({ ...s, forcePortraitPage: e.target.checked }))} />
              Force portrait page (helps avoid auto-rotation when saving as PDF)
            </label>
            <label className="flex items-center gap-2 col-span-2">Page Orientation
              <select name="pageOrientation" value={settings.pageOrientation} onChange={handleChange} className="border px-2 py-1 rounded w-40">
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </label>
            <label className="flex items-center gap-2 col-span-2">
              <input name="printAsImage" type="checkbox" checked={!!settings.printAsImage} onChange={(e) => setSettings(s => ({ ...s, printAsImage: e.target.checked }))} />
              Print as PNG image (more consistent sizing, avoids SVG print quirks)
            </label>

            <div className="col-span-2 border-t pt-2 mt-1" />
            <div className="col-span-2 font-medium">USB Printing (WebUSB)</div>
            <label className="flex items-center gap-2 col-span-2">
              <input name="usbEnabled" type="checkbox" checked={!!settings.usbEnabled} onChange={handleChange} />
              Enable USB printing via WebUSB
            </label>
            <label className="flex items-center gap-2 col-span-2">
              <input name="usbDebugEnabled" type="checkbox" checked={!!settings.usbDebugEnabled} onChange={handleChange} />
              Enable USB debug logging (console + alerts)
            </label>
            <label className="flex items-center gap-2 col-span-2">
              <input name="usbTryAllEndpoints" type="checkbox" checked={!!settings.usbTryAllEndpoints} onChange={handleChange} />
              Try all OUT endpoints (bulk and interrupt) when printing
            </label>
            <label className="flex items-center gap-2">Vendor ID
              <input name="usbVendorId" type="text" placeholder="e.g. 0x0A5F or 2655" value={settings.usbVendorId} onChange={handleChange} className="border px-2 py-1 rounded w-40" />
            </label>
            <label className="flex items-center gap-2">Product ID
              <input name="usbProductId" type="text" placeholder="e.g. 0x00A1 or 161" value={settings.usbProductId} onChange={handleChange} className="border px-2 py-1 rounded w-40" />
            </label>
            <label className="flex items-center gap-2">Command Language
              <select name="usbCommandLanguage" value={settings.usbCommandLanguage} onChange={(e)=> setSettings(s=>({ ...s, usbCommandLanguage: e.target.value }))} className="border px-2 py-1 rounded w-52">
                <option value="zpl">ZPL (Zebra/Label)</option>
                <option value="escpos">ESC/POS (Receipt/Label)</option>
                <option value="tspl">TSPL/TSPL2 (TSC)</option>
                <option value="epl">EPL (Eltron)</option>
                <option value="cpcl">CPCL (Zebra mobile)</option>
              </select>
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">Cancel</button>
          <button disabled={saving} onClick={save} className="text-sm px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}


