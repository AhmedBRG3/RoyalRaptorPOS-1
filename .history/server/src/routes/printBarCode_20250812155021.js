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

// Rotation in degrees to apply to the barcode image (change to -90 or 270 if needed)
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
 * Generate a flattened, rotated PNG buffer sized to the label pixel dimensions.
 * - Uses bwip-js to render at a reasonable internal resolution (scale + height)
 * - Rotates (ROTATE_DEG) using sharp
 * - Resizes to exact pxWidth x pxHeight and flattens against white to avoid black backgrounds
 */
async function generateBarcodeBuffer(code, barcodeType) {
  const pxWidth = mmToPixels(LABEL_WIDTH_MM);   // final width in pixels (e.g. ~319)
  const pxHeight = mmToPixels(LABEL_HEIGHT_MM); // final height in pixels (e.g. ~239)

  // Tune these if you want thicker/thinner bars or bigger text:
  const BWIP_SCALE = 3; // base scale for bwip-js (higher = thicker bars)
  const BAR_HEIGHT = Math.round(pxHeight * 0.65); // bar height in pixels (before text)
  const TEXT_SIZE = Math.round(pxHeight * 0.13);  // text size in px-ish units

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

  // Rotate then resize to exact label pixel dims and flatten against white
  const rotatedAndSized = await sharp(rawBuffer)
    .rotate(ROTATE_DEG) // apply rotation
    .resize(pxWidth, pxHeight, { fit: "contain", background: "#FFFFFF" })
    .flatten({ background: "#FFFFFF" }) // remove transparency -> white
    .png({ compressionLevel: 6 })
    .toBuffer();

  return rotatedAndSized;
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

    // Draw white background (double-insurance)
    doc.rect(0, 0, widthPts, heightPts).fill("#FFFFFF");

    // Put the rotated, flattened image full-size
    doc.image(barcodeBuffer, 0, 0, {
      width: widthPts,
      height: heightPts,
    });

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
