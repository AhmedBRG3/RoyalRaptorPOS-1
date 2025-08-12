const express = require("express");
const { exec, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const bwipjs = require("bwip-js");
const PDFDocument = require("pdfkit");
const { print } = require("pdf-to-printer");
const sharp = require("sharp");

const router = express.Router();

// Label size in mm
const LABEL_WIDTH_MM = 40;
const LABEL_HEIGHT_MM = 30;
const PRINTER_DPI = 203;

// Rotation to apply AFTER generating the swapped image
const ROTATE_DEG = 90;

// Convert mm → points (PDFKit)
const mmToPoints = (mm) => (mm / 25.4) * 72;
// Convert mm → pixels (for image generation)
const mmToPixels = (mm) => Math.round((mm / 25.4) * PRINTER_DPI);

function findXPrinter() {
  const platform = os.platform();
  try {
    let printers = [];
    switch (platform) {
      case "win32": {
        const winOutput = execSync("wmic printer get name", { encoding: "utf8" });
        printers = winOutput
          .split("\n")
          .map((line) => line.trim())
          .filter((name) => name && name.toLowerCase().includes("xprint"));
        break;
      }
      default: {
        const unixOutput = execSync('lpstat -p 2>/dev/null || echo "No printers"', { encoding: "utf8" });
        printers = unixOutput
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("printer"))
          .map((line) => line.split(" ")[1])
          .filter((name) => name && name.toLowerCase().includes("xprint"));
        break;
      }
    }
    if (printers.length === 0) throw new Error('No printer with "xprint" in name found');
    return printers[0];
  } catch (error) {
    console.error("Error finding XPrinter:", error.message);
    return platform === "win32" ? "Xprinter XP-350B" : "Xprinter_XP_350B";
  }
}

function isValidBarcode(code, type = "CODE128") {
  if (!code || typeof code !== "string") return false;
  switch (type) {
    case "CODE128": return code.length > 0 && code.length <= 80;
    case "EAN13": return /^\d{13}$/.test(code);
    case "UPC": return /^\d{12}$/.test(code);
    default: return code.length > 0;
  }
}

/**
 * Generate a barcode by:
 * 1) Rendering barcode at swapped (wrong) dims (preW x preH)
 * 2) Resize to preW x preH (contain) and flatten to white
 * 3) Rotate ROTATE_DEG
 * 4) Resize down (fit:'inside') if needed (no squashing)
 * 5) Pad to exact pxWidth x pxHeight with white background
 */
async function generateBarcodeBuffer(code, barcodeType) {
  const pxWidth = mmToPixels(LABEL_WIDTH_MM);   // final width in px (e.g. ~320)
  const pxHeight = mmToPixels(LABEL_HEIGHT_MM); // final height in px (e.g. ~240)

  // Intentionally swapped dimensions (wrong orientation/dimensions)
  const preW = pxHeight; // use height as width initially
  const preH = pxWidth;  // use width as height initially

  // Tune these for thickness/clarity:
  const BWIP_SCALE = 4; // base scale (higher -> thicker bars)
  const BAR_HEIGHT = Math.round(preH * 0.62); // height of the bars before text
  const TEXT_SIZE = Math.max(10, Math.round(preH * 0.12)); // readable text size

  // 1) Render with bwip-js
  const rawBuffer = await bwipjs.toBuffer({
    bcid: barcodeType.toLowerCase(),
    text: code,
    scale: BWIP_SCALE,
    height: BAR_HEIGHT,
    includetext: true,
    textxalign: "center",
    textsize: TEXT_SIZE,
    backgroundcolor: "#FFFFFF",
    paddingwidth: 8,
    paddingheight: 8,
  });

  // 2) Resize to swapped target (contain to preserve aspect ratio) and flatten
  const preSizedBuffer = await sharp(rawBuffer)
    .resize(preW, preH, { fit: "contain", background: "#FFFFFF" })
    .flatten({ background: "#FFFFFF" })
    .png()
    .toBuffer();

  // 3) Rotate the swapped image to correct orientation
  const rotatedBuffer = await sharp(preSizedBuffer)
    .rotate(ROTATE_DEG)
    .png()
    .toBuffer();

  // 4) If rotated image is larger than final, scale it down (fit inside) — no squashing.
  let adjusted = rotatedBuffer;
  const metaRot = await sharp(rotatedBuffer).metadata();
  if (metaRot.width > pxWidth || metaRot.height > pxHeight) {
    adjusted = await sharp(rotatedBuffer)
      .resize({ width: pxWidth, height: pxHeight, fit: "inside" })
      .png()
      .toBuffer();
  }

  // 5) Pad (extend) to the exact final pixel dimensions (centered)
  const metaAdj = await sharp(adjusted).metadata();
  const padLeft = Math.floor((pxWidth - metaAdj.width) / 2);
  const padRight = pxWidth - metaAdj.width - padLeft;
  const padTop = Math.floor((pxHeight - metaAdj.height) / 2);
  const padBottom = pxHeight - metaAdj.height - padTop;

  const finalBuffer = await sharp(adjusted)
    .extend({
      top: Math.max(0, padTop),
      bottom: Math.max(0, padBottom),
      left: Math.max(0, padLeft),
      right: Math.max(0, padRight),
      background: "#FFFFFF",
    })
    .flatten({ background: "#FFFFFF" })
    .png()
    .toBuffer();

  return finalBuffer;
}

async function createBarcodePDF(code, barcodeType, pdfPath) {
  const barcodeBuffer = await generateBarcodeBuffer(code, barcodeType);

  const widthPts = mmToPoints(LABEL_WIDTH_MM);
  const heightPts = mmToPoints(LABEL_HEIGHT_MM);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [widthPts, heightPts],
      margins: { top: 0, left: 0, right: 0, bottom: 0 },
    });

    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // White background
    doc.rect(0, 0, widthPts, heightPts).fill("#FFFFFF");

    // Place final image (already rotated & sized)
    doc.image(barcodeBuffer, 0, 0, { width: widthPts, height: heightPts });
    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

router.post("/", async (req, res) => {
  const { code, barcodeType = "code128", copies = 1 } = req.body;
  const platform = os.platform();

  if (!code) return res.status(400).json({ error: "No code provided" });
  if (!isValidBarcode(code, barcodeType.toUpperCase())) {
    return res.status(400).json({ error: "Invalid barcode format" });
  }

  try {
    const printerName = findXPrinter();
    console.log("Using printer:", printerName);

    if (platform === "win32") {
      const pdfPath = path.resolve(`barcode_${Date.now()}.pdf`);
      await createBarcodePDF(code, barcodeType, pdfPath);
      await print(pdfPath, { printer: printerName, copies });
      console.log(`Printed to ${printerName}`);
      setTimeout(() => { try { fs.unlinkSync(pdfPath); } catch {} }, 5000);
    } else {
      const tmpFile = path.resolve(`barcode_${Date.now()}.png`);
      const pngBuffer = await generateBarcodeBuffer(code, barcodeType);
      fs.writeFileSync(tmpFile, pngBuffer);
      exec(`lp -d "${printerName}" "${tmpFile}"`, (err) => {
        if (err) {
          console.error("Print error:", err);
          return res.status(500).json({ error: "Print failed", details: err.message });
        }
        setTimeout(() => { try { fs.unlinkSync(tmpFile); } catch {} }, 5000);
      });
    }

    res.json({ success: true, code, type: barcodeType, printer: printerName });
  } catch (error) {
    console.error("Barcode printing error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
