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
const DPI = 203; // typical Xprinter

// Convert mm → points (PDF) and mm → px (image)
const mmToPoints = (mm) => (mm / 25.4) * 72;
const mmToPixels = (mm) => Math.round((mm / 25.4) * DPI);

// Find printer with "xprint" in name
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
      const unixOutput = execSync("lpstat -p 2>/dev/null || echo 'No printers'", { encoding: "utf8" });
      printers = unixOutput
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("printer"))
        .map((line) => line.split(" ")[1])
        .filter((name) => name && name.toLowerCase().includes("xprint"));
    }
    if (!printers.length) throw new Error("No printer found");
    console.log(`Found XPrinter: "${printers[0]}"`);
    return printers[0];
  } catch {
    return platform === "win32" ? "Xprinter XP-350B" : "Xprinter_XP_350B";
  }
}

// Basic validation
function isValidBarcode(code, type = "CODE128") {
  if (!code || typeof code !== "string") return false;
  switch (type) {
    case "CODE128": return code.length > 0 && code.length <= 80;
    case "EAN13": return /^\d{13}$/.test(code);
    case "UPC": return /^\d{12}$/.test(code);
    default: return code.length > 0;
  }
}

// Generate barcode at full label resolution
function generateBarcodeBuffer(code, barcodeType) {
  const widthPx = mmToPixels(LABEL_WIDTH_MM);
  const heightPx = mmToPixels(LABEL_HEIGHT_MM) - 10; // margin
  return bwipjs.toBuffer({
    bcid: barcodeType.toLowerCase(),
    text: code,
    scaleX: 2,
    scaleY: 2,
    height: heightPx / 3, // controls bar height
    includetext: false,
    backgroundcolor: "FFFFFF",
    paddingwidth: 0,
    paddingheight: 0
  });
}

// Create rotated, centered PDF for printing
async function createBarcodePDF(code, barcodeType, pdfPath) {
  const barcodeBuffer = await generateBarcodeBuffer(code, barcodeType);
  const rotatedBuffer = await sharp(barcodeBuffer)
    .rotate(90, { background: "white" })
    .resize(mmToPixels(LABEL_WIDTH_MM), mmToPixels(LABEL_HEIGHT_MM), {
      fit: "contain",
      background: "white"
    })
    .toBuffer();

  const widthPts = mmToPoints(LABEL_WIDTH_MM);
  const heightPts = mmToPoints(LABEL_HEIGHT_MM);

  return new Promise((resolve) => {
    const doc = new PDFDocument({
      size: [widthPts, heightPts],
      margins: { top: 0, left: 0, right: 0, bottom: 0 }
    });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    const imgWidth = widthPts * 0.9;
    const imgHeight = heightPts * 0.9;
    const x = (widthPts - imgWidth) / 2;
    const y = (heightPts - imgHeight) / 2;

    doc.image(rotatedBuffer, x, y, { width: imgWidth, height: imgHeight });
    doc.end();

    stream.on("finish", resolve);
  });
}

router.post("/", async (req, res) => {
  const { code, barcodeType = "code128", copies = 1 } = req.body;
  const platform = os.platform();

  if (!code) return res.status(400).json({ error: "No code provided" });
  if (!isValidBarcode(code, barcodeType.toUpperCase())) {
    return res.status(400).json({ error: "Invalid barcode format" });
  }
  if (copies < 1 || copies > 10) {
    return res.status(400).json({ error: "Copies must be between 1 and 10" });
  }

  try {
    const printerName = findXPrinter();
    console.log("Using printer:", printerName);

    if (platform === "win32") {
      const pdfPath = path.resolve(`barcode_${Date.now()}.pdf`);
      await createBarcodePDF(code, barcodeType, pdfPath);
      await print(pdfPath, { printer: printerName, copies });
      console.log(`Printed PDF to ${printerName}`);
      setTimeout(() => { try { fs.unlinkSync(pdfPath); } catch {} }, 5000);
    } else {
      const tmpFile = path.resolve(`barcode_${Date.now()}.png`);
      const pngBuffer = await generateBarcodeBuffer(code, barcodeType);
      const rotatedBuffer = await sharp(pngBuffer)
        .rotate(90, { background: "white" })
        .resize(mmToPixels(LABEL_WIDTH_MM), mmToPixels(LABEL_HEIGHT_MM), {
          fit: "contain",
          background: "white"
        })
        .toBuffer();
      fs.writeFileSync(tmpFile, rotatedBuffer);
      exec(`lp -d "${printerName}" "${tmpFile}"`, (err, stdout, stderr) => {
        if (err) {
          console.error("Print error:", stderr);
          return res.status(500).json({ error: "Print failed", details: stderr });
        }
        console.log("Print job sent:", stdout);
        setTimeout(() => { try { fs.unlinkSync(tmpFile); } catch {} }, 5000);
      });
    }

    res.json({
      success: true,
      message: `Barcode printed successfully (${copies} copy/copies)`,
      code: code,
      type: barcodeType,
      printer: printerName
    });
  } catch (error) {
    console.error("Barcode printing error:", error);
    res.status(500).json({ error: "Failed to process barcode print request", details: error.message });
  }
});

module.exports = router;
