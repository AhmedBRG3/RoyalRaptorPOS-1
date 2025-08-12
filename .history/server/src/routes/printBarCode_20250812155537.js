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
const PRINTER_DPI = 203; // typical thermal printer DPI

// Convert mm → points (PDFKit)
const mmToPoints = (mm) => (mm / 25.4) * 72;
// Convert mm → pixels (for image generation)
const mmToPixels = (mm) => Math.round((mm / 25.4) * PRINTER_DPI);

// Find the Xprinter by name (windows or unix)
function findXPrinter() {
  const platform = os.platform();
  try {
    let printers = [];
    if (platform === "win32") {
      const winOutput = execSync("wmic printer get name", { encoding: "utf8" });
      printers = winOutput
        .split("\n")
        .map((line) => line.trim())
        .filter((name) => name && name.toLowerCase().includes("xprint"));
    } else {
      const unixOutput = execSync('lpstat -p 2>/dev/null || echo "No printers"', { encoding: "utf8" });
      printers = unixOutput
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("printer"))
        .map((line) => line.split(" ")[1])
        .filter((name) => name && name.toLowerCase().includes("xprint"));
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
  switch (type.toUpperCase()) {
    case "CODE128": return code.length > 0 && code.length <= 80;
    case "EAN13": return /^\d{13}$/.test(code);
    case "UPC": return /^\d{12}$/.test(code);
    default: return code.length > 0;
  }
}

/**
 * Generate barcode image buffer:
 * - Directly at the correct width and height (pixels)
 * - Maintain good bar thickness & height via scale & height params
 * - Include text below barcode, centered and readable
 * - White background (flattened)
 */
async function generateBarcodeBuffer(code, barcodeType) {
  const pxWidth = mmToPixels(LABEL_WIDTH_MM);
  const pxHeight = mmToPixels(LABEL_HEIGHT_MM);

  // bwip-js parameters:
  // scale controls bar thickness, height is bar height in pixels
  // We reserve about 20% of height for text
  const BAR_HEIGHT = Math.round(pxHeight * 0.75);
  const TEXT_SIZE = Math.round(pxHeight * 0.18);
  const SCALE = 4; // tweak for thickness, 4 works well for 203 DPI

  const rawBuffer = await bwipjs.toBuffer({
    bcid: barcodeType.toLowerCase(),
    text: code,
    scale: SCALE,
    height: BAR_HEIGHT,
    includetext: true,
    textxalign: "center",
    textsize: TEXT_SIZE,
    backgroundcolor: "FFFFFF",
    paddingwidth: 8,
    paddingheight: 8,
  });

  // Resize precisely to label dimensions (no distortion)
  // sharp 'contain' mode preserves aspect ratio and pads with white
  return sharp(rawBuffer)
    .resize(pxWidth, pxHeight, { fit: "contain", background: "#FFFFFF" })
    .flatten({ background: "#FFFFFF" })
    .png()
    .toBuffer();
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

    // Fill background white
    doc.rect(0, 0, widthPts, heightPts).fill("#FFFFFF");

    // Add barcode image full size
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
  if (!isValidBarcode(code, barcodeType)) {
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
