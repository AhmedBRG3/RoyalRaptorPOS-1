import bwipjs from "bwip-js";
import sharp from "sharp";
import fs from "fs";
import os from "os";
import path from "path";
import { exec } from "child_process";
import PDFDocument from "pdfkit";

const LABEL_WIDTH_MM = 30;  // Printer label width
const LABEL_HEIGHT_MM = 40; // Printer label height
const GAP_OFFSET_MM = 0;    // Adjust if needed to shift image down
const PRINTER_NAME = "Xprinter XP-350B"; // Change to your printer's name

function mmToPoints(mm) {
  return (mm / 25.4) * 72;
}

async function generateBarcodeBuffer(code, barcodeType = "code128") {
  return bwipjs.toBuffer({
    bcid: barcodeType,
    text: code,
    scale: 3,
    height: 10,
    includetext: true,
    textxalign: "center"
  });
}

async function createBarcodePDF(code, barcodeType, pdfPath) {
  const barcodeBuffer = await generateBarcodeBuffer(code, barcodeType);

  const widthPts = mmToPoints(LABEL_WIDTH_MM);
  const heightPts = mmToPoints(LABEL_HEIGHT_MM);
  const gapOffsetPts = mmToPoints(GAP_OFFSET_MM);

  const rotatedBuffer = await sharp(barcodeBuffer)
    .rotate(90) // Rotate before resizing
    .resize(Math.round(widthPts), Math.round(heightPts), {
      fit: "fill"
    })
    .toBuffer();

  return new Promise((resolve) => {
    const doc = new PDFDocument({
      size: [widthPts, heightPts],
      margins: { top: 0, left: 0, right: 0, bottom: 0 }
    });

    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.image(rotatedBuffer, 0, gapOffsetPts, {
      width: widthPts,
      height: heightPts
    });

    doc.end();
    stream.on("finish", resolve);
  });
}

function printPDF(pdfPath) {
  const platform = os.platform();

  if (platform === "win32") {
    // Use Windows default printer or specific printer name
    exec(`powershell -Command Start-Process -FilePath "${pdfPath}" -Verb Print`, (err) => {
      if (err) console.error("Print error:", err);
    });
  } else {
    // macOS / Linux
    exec(`lp -d "${PRINTER_NAME}" "${pdfPath}"`, (err) => {
      if (err) console.error("Print error:", err);
    });
  }
}

async function main() {
  const code = "123456789012"; // Example barcode
  const pdfPath = path.join(process.cwd(), "barcode-label.pdf");

  await createBarcodePDF(code, "code128", pdfPath);
  printPDF(pdfPath);
}

main().catch(console.error);
