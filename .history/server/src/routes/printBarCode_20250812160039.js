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

const LABEL_WIDTH_MM = 40;
const LABEL_HEIGHT_MM = 30;
const PRINTER_DPI = 300; // Increased from 203 for better quality

// mm → points for PDFKit
const mmToPoints = (mm) => (mm / 25.4) * 72;
// mm → pixels for image generation
const mmToPixels = (mm) => Math.round((mm / 25.4) * PRINTER_DPI);

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
 * Generate barcode image buffer at correct orientation and size
 */
async function generateBarcodeBuffer(code, barcodeType) {
  // For landscape orientation (rotated 90°), we need HEIGHT as width and WIDTH as height
  const pxWidth = mmToPixels(LABEL_HEIGHT_MM);  // 30mm becomes width
  const pxHeight = mmToPixels(LABEL_WIDTH_MM);  // 40mm becomes height

  // Calculate barcode dimensions for landscape orientation
  const BAR_HEIGHT = Math.round(pxWidth * 0.6); // Bars run along the width (shorter dimension)
  const TEXT_SIZE = Math.round(pxHeight * 0.12); // Text size relative to height
  const SCALE = 2; // Better scale for sharper output

  console.log(`Generating barcode: ${pxWidth}x${pxHeight}px, bar height: ${BAR_HEIGHT}px, text: ${TEXT_SIZE}px`);

  // Generate barcode in landscape orientation
  const rawBuffer = await bwipjs.toBuffer({
    bcid: barcodeType.toLowerCase(),
    text: code,
    scale: SCALE,
    height: BAR_HEIGHT,
    includetext: true,
    textxalign: "center",
    textsize: TEXT_SIZE,
    backgroundcolor: "FFFFFF",
    paddingwidth: 15,
    paddingheight: 15,
    rotate: "R", // Rotate 90 degrees clockwise for landscape
  });

  // Process with sharp to ensure exact dimensions and high quality
  return sharp(rawBuffer)
    .resize(mmToPixels(LABEL_WIDTH_MM), mmToPixels(LABEL_HEIGHT_MM), { 
      fit: "fill", // Fill the entire label area
      background: "#FFFFFF" 
    })
    .flatten({ background: "#FFFFFF" })
    .sharpen() // Add sharpening for better quality
    .png({ quality: 100, compressionLevel: 0 }) // Maximum quality PNG
    .toBuffer();
}

/**
 * Create PDF file for Windows printing
 */
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

    // Place image at exact size with no additional scaling
    doc.image(barcodeBuffer, 0, 0, {
      width: widthPts,
      height: heightPts,
      fit: [widthPts, heightPts]
    });

    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

/**
 * Create high-quality PNG for Unix printing
 */
async function createBarcodeImage(code, barcodeType, imagePath) {
  const pngBuffer = await generateBarcodeBuffer(code, barcodeType);
  
  // Write high-quality PNG directly
  fs.writeFileSync(imagePath, pngBuffer);
  
  return imagePath;
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
    console.log(`Label dimensions: ${LABEL_WIDTH_MM}x${LABEL_HEIGHT_MM}mm`);

    if (platform === "win32") {
      // Windows: create PDF and print
      const pdfPath = path.resolve(`barcode_${Date.now()}.pdf`);
      await createBarcodePDF(code, barcodeType, pdfPath);
      
      // Print with specific settings for better quality
      await print(pdfPath, { 
        printer: printerName, 
        copies,
        scale: "noscale", // Don't scale the PDF
        orientation: "portrait" // Keep original orientation
      });
      
      console.log(`Printed ${copies} copies to ${printerName}`);
      setTimeout(() => { try { fs.unlinkSync(pdfPath); } catch {} }, 5000);
      
    } else {
      // Unix: create PNG and print with better settings
      const tmpFile = path.resolve(`barcode_${Date.now()}.png`);
      await createBarcodeImage(code, barcodeType, tmpFile);
      
      // Print with specific settings for label printers
      const printCmd = `lp -d "${printerName}" -o media=Custom.${LABEL_WIDTH_MM}x${LABEL_HEIGHT_MM}mm -o fit-to-page "${tmpFile}"`;
      
      exec(printCmd, (err, stdout, stderr) => {
        if (err) {
          console.error("Print error:", err);
          console.error("stderr:", stderr);
          return res.status(500).json({ error: "Print failed", details: err.message });
        }
        console.log(`Printed ${copies} copies to ${printerName}`);
        console.log("Print output:", stdout);
        setTimeout(() => { try { fs.unlinkSync(tmpFile); } catch {} }, 5000);
      });
    }

    res.json({ 
      success: true, 
      code, 
      type: barcodeType, 
      printer: printerName,
      dimensions: `${LABEL_WIDTH_MM}x${LABEL_HEIGHT_MM}mm`,
      resolution: `${PRINTER_DPI}dpi`
    });
    
  } catch (error) {
    console.error("Barcode printing error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;