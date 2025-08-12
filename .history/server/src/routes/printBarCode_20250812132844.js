const express = require("express");
const { exec, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const bwipjs = require("bwip-js");

const router = express.Router();

// Function to find the first printer with "xprint" in its name
function findXPrinter() {
  const platform = os.platform();

  try {
    let printers = [];

    switch (platform) {
      case "win32":
        const winOutput = execSync("wmic printer get name", { encoding: "utf8" });
        printers = winOutput
          .split("\n")
          .map(line => line.trim())
          .filter(name => name && name.toLowerCase().includes("xprint"));
        break;

      case "darwin":
      case "linux":
      default:
        const unixOutput = execSync('lpstat -p 2>/dev/null || echo "No printers"', {
          encoding: "utf8"
        });
        printers = unixOutput
          .split("\n")
          .map(line => line.trim())
          .filter(line => line.startsWith("printer"))
          .map(line => line.split(" ")[1])
          .filter(name => name && name.toLowerCase().includes("xprint"));
        break;
    }

    if (printers.length === 0) {
      throw new Error('No printer with "xprint" in name found');
    }

    const selectedPrinter = printers[0];
    console.log(`Found XPrinter: "${selectedPrinter}"`);
    return selectedPrinter;
  } catch (error) {
    console.error("Error finding XPrinter:", error.message);

    switch (platform) {
      case "win32":
        return "Xprinter XP-350B";
      case "darwin":
      case "linux":
      default:
        return "Xprinter_XP_350B";
    }
  }
}

// Function to validate barcode content
function isValidBarcode(code, type = "CODE128") {
  if (!code || typeof code !== "string") return false;

  switch (type) {
    case "CODE128":
      return code.length > 0 && code.length <= 80;
    case "EAN13":
      return /^\d{13}$/.test(code);
    case "UPC":
      return /^\d{12}$/.test(code);
    default:
      return code.length > 0;
  }
}

// Generate barcode image (cross-platform)
async function generateBarcodeImage(code, barcodeType, filePath) {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: barcodeType.toLowerCase(), // code128, ean13, upc, etc.
        text: code,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: "center",
      },
      (err, png) => {
        if (err) return reject(err);
        fs.writeFileSync(filePath, png);
        resolve();
      }
    );
  });
}

router.post("/", async (req, res) => {
  const { code, barcodeType = "code128", copies = 1 } = req.body;
  const platform = os.platform();

  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  if (!isValidBarcode(code, barcodeType.toUpperCase())) {
    return res.status(400).json({ error: "Invalid barcode format" });
  }

  if (copies < 1 || copies > 10) {
    return res.status(400).json({ error: "Copies must be between 1 and 10" });
  }

  try {
    const printerName = findXPrinter();

    // Create image file in current directory
    const tmpFile = path.resolve(`barcode_${Date.now()}.png`);
    await generateBarcodeImage(code, barcodeType, tmpFile);
    console.log("Barcode image created at:", tmpFile);

    let printCmd;
    if (platform === "win32") {
      // Use mspaint /pt for silent printing to a named printer
      printCmd = `mspaint /pt "${tmpFile}" "${printerName}"`;
    } else {
      // Use lp for macOS / Linux
      printCmd = `lp -d "${printerName}" "${tmpFile}"`;
    }

    // Debug: list printers
    const listPrintersCmd = platform === "win32" ? "wmic printer get name" : "lpstat -p -d";
    exec(listPrintersCmd, (err, stdout) => {
      if (!err) console.log("Available printers:\n", stdout);

      exec(printCmd, (err, stdout, stderr) => {
        if (err) {
          console.error("Print error:", err, stderr);
          return res.status(500).json({ error: "Print failed", details: stderr });
        }

        console.log("Print job sent:", stdout);

        setTimeout(() => {
          try {
            fs.unlinkSync(tmpFile);
            console.log("Deleted:", tmpFile);
          } catch (unlinkErr) {
            console.error("Error cleaning up file:", unlinkErr);
          }
        }, 5000);

        res.json({
          success: true,
          message: `Barcode printed successfully (${copies} cop${copies === 1 ? "y" : "ies"})`,
          code: code,
          type: barcodeType,
          printer: printerName,
          file: tmpFile
        });
      });
    });
  } catch (error) {
    console.error("Barcode printing error:", error);
    res.status(500).json({
      error: "Failed to process barcode print request",
      details: error.message
    });
  }
});

module.exports = router;
