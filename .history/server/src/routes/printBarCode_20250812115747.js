const express = require("express");
const { exec, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

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
    console.log(`All XPrinters found: [${printers.map(p => `"${p}"`).join(", ")}]`);

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

// Generate TSPL barcode content
function generateTSPL(code, barcodeType = "EAN13", copies = 1) {
  return `SIZE 40 mm,30 mm
GAP 2 mm,0 mm
CLS
BARCODE 50,50,"128",100,1,0,2,2,"${code}"
PRINT 1,${copies}`;
}

router.post("/", (req, res) => {
  const { code, barcodeType = "CODE128", copies = 1 } = req.body;
  const platform = os.platform();

  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  if (!isValidBarcode(code, barcodeType)) {
    return res.status(400).json({ error: "Invalid barcode format" });
  }

  if (copies < 1 || copies > 10) {
    return res.status(400).json({ error: "Copies must be between 1 and 10" });
  }

  try {
    const printerName = findXPrinter();
    const tspl = generateTSPL(code, barcodeType, copies);

    // Save file locally (absolute path in project dir)
    const tmpFile = path.resolve(`barcode_${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, tspl, { encoding: "utf8" });

    console.log("Barcode file created at:", tmpFile);

    let printCmd;
    if (platform === "win32") {
      // ✅ Direct USB printing to USB003 (bypasses lpr/print)
      printCmd = `copy /B "${tmpFile}" USB003`;
    } else {
      printCmd = `lp -d "${printerName}" -o raw "${tmpFile}"`;
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

        // Delay deletion for spooler to read file
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
