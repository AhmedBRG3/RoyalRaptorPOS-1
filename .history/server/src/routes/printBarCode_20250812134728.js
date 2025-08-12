const express = require("express");
const { exec, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const bwipjs = require("bwip-js");

const router = express.Router();

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

async function generateBarcodeImage(code, barcodeType, filePath) {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer({
      bcid: barcodeType.toLowerCase(),
      text: code,
      scale: 2,
      height: 10,
      includetext: true,
      textxalign: "center",
    }, (err, png) => {
      if (err) return reject(err);
      fs.writeFileSync(filePath, png);
      resolve();
    });
  });
}

function generateCenteredHTML(imagePath, htmlPath) {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Barcode Print</title>
<style>
  @page { margin: 0; }
  body {
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
  }
  img {
    max-width: 90%;
    max-height: 90%;
  }
</style>
</head>
<body>
  <img src="file:///${imagePath.replace(/\\/g, "/")}" />
  <script>
    window.onload = () => { window.print(); }
  </script>
</body>
</html>
  `;
  fs.writeFileSync(htmlPath, htmlContent, "utf8");
}

router.post("/", async (req, res) => {
  const { code, barcodeType = "code128", copies = 1 } = req.body;
  const platform = os.platform();

  if (!code) return res.status(400).json({ error: "No code provided" });
  if (!isValidBarcode(code, barcodeType.toUpperCase())) return res.status(400).json({ error: "Invalid barcode format" });
  if (copies < 1 || copies > 10) return res.status(400).json({ error: "Copies must be between 1 and 10" });

  try {
    const printerName = findXPrinter();
    const tmpFile = path.resolve(`barcode_${Date.now()}.png`);
    await generateBarcodeImage(code, barcodeType, tmpFile);
    console.log("Barcode image created at:", tmpFile);

    // Create HTML wrapper for centering
    const tmpHTML = path.resolve(`barcode_${Date.now()}.html`);
    generateCenteredHTML(tmpFile, tmpHTML);

    let printCmd;
    if (platform === "win32") {
      printCmd = `start "" "${tmpHTML}"`; // opens default browser with print dialog
    } else if (platform === "darwin") {
      printCmd = `open "${tmpHTML}"`;
    } else {
      printCmd = `xdg-open "${tmpHTML}"`;
    }

    exec(printCmd, (err) => {
      if (err) {
        console.error("Print error:", err);
        return res.status(500).json({ error: "Print failed", details: err.message });
      }

      // Cleanup after short delay
      setTimeout(() => {
        try { fs.unlinkSync(tmpFile); } catch {}
        try { fs.unlinkSync(tmpHTML); } catch {}
      }, 10000);

      res.json({
        success: true,
        message: `Barcode print dialog opened for ${copies} cop${copies === 1 ? "y" : "ies"}`,
        printer: printerName,
        file: tmpFile
      });
    });

  } catch (error) {
    console.error("Barcode printing error:", error);
    res.status(500).json({ error: "Failed to process barcode print request", details: error.message });
  }
});

module.exports = router;
