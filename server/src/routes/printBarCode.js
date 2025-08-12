const express = require("express");
const { exec, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const bwipjs = require("bwip-js");
const PDFDocument = require("pdfkit");
const { print } = require("pdf-to-printer");
const sharp = require("sharp"); // NEW

const router = express.Router();

const mmToPoints = (mm) => (mm / 25.4) * 72;
const LABEL_WIDTH_MM = 40;
const LABEL_HEIGHT_MM = 30;

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
    const selectedPrinter = printers[0];
    console.log(`Found XPrinter: "${selectedPrinter}"`);
    return selectedPrinter;
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

function generateBarcodeBuffer(code, barcodeType) {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: barcodeType.toLowerCase(),
        text: code,
        scale: 2,
        height: 8,
        includetext: true,
        textxalign: "center",
      },
      (err, png) => {
        if (err) reject(err);
        else resolve(png);
      }
    );
  });
}

const GAP_OFFSET_MM = 0;

async function createBarcodePDF(code, barcodeType, pdfPath) {
  const barcodeBuffer = await generateBarcodeBuffer(code, barcodeType);

  // Rotate image before putting it in PDF
  const rotatedBuffer = await sharp(barcodeBuffer)
    .rotate(90) // Rotate clockwise
    .toBuffer();

  const widthPts = mmToPoints(LABEL_WIDTH_MM);
  const heightPts = mmToPoints(LABEL_HEIGHT_MM);
  const gapOffsetPts = mmToPoints(GAP_OFFSET_MM);

  return new Promise((resolve) => {
    const doc = new PDFDocument({
      size: [widthPts, heightPts],
      margins: { top: 0, left: 0, right: 0, bottom: 0 },
    });

    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    const imgWidth = widthPts * 0.9;
    const imgHeight = heightPts * 0.9;
    const x = (widthPts - imgWidth) / 2;
    const y = (heightPts - imgHeight) / 2 + gapOffsetPts;

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
      const rotatedBuffer = await sharp(pngBuffer).rotate(90).toBuffer();
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
      printer: printerName,
    });
  } catch (error) {
    console.error("Barcode printing error:", error);
    res.status(500).json({ error: "Failed to process barcode print request", details: error.message });
  }
});

module.exports = router;
