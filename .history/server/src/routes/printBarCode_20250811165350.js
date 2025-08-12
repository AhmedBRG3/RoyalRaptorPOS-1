const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { print } = require("printer-lp");

const router = express.Router();

router.post("/", async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).send("No barcode code provided");
  }

  const tspl = `
SIZE 40 mm,30 mm
GAP 2 mm,0 mm
CLS
BARCODE 50,50,"128",100,1,0,2,2,"${code}"
PRINT 1,1
`;

  try {
    const platform = os.platform();
    let printerName = null;

    // Detect installed printers and find one containing "xprinter"
    if (platform === "win32") {
      const stdout = await execShell("wmic printer get name");
      printerName = stdout.split("\n").find(line => line.toLowerCase().includes("xprinter"))?.trim();
    } else {
      const stdout = await execShell("lpstat -p -d");
      printerName = stdout.split("\n").find(line => line.toLowerCase().includes("xprinter"))?.split(" ")[1];
    }

    if (!printerName) {
      return res.status(404).send("No Xprinter found");
    }

    console.log(`Printing to: ${printerName}`);

    await print(tspl, { printer: printerName, type: "RAW" });

    res.send(`Printed successfully on ${platform} to ${printerName}`);
  } catch (err) {
    console.error("Print error:", err);
    res.status(500).send("Print failed");
  }
});

// Utility: wrap exec in a promise
function execShell(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

module.exports = router;
