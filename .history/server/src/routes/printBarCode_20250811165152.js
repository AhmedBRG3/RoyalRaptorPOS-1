const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { print, getPrinters } = require("printer-lp");

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
    // Detect platform
    const platform = os.platform();

    // Get installed printers
    const printers = await getPrinters();
    console.log("Available printers:", printers.map(p => p.name));

    // Find the first Xprinter automatically
    const printerName = printers.find(p => p.name.toLowerCase().includes("xprinter"))?.name;
    if (!printerName) {
      return res.status(404).send("No Xprinter found");
    }

    // Send raw TSPL to printer
    await print(tspl, { printer: printerName, type: "RAW" });

    res.send(`Printed successfully on ${platform} to ${printerName}`);
  } catch (err) {
    console.error("Print error:", err);
    res.status(500).send("Print failed");
  }
});

module.exports = router;
