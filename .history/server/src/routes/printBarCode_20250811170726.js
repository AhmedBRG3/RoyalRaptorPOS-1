const express = require("express");
const ThermalPrinter = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;

const router = express.Router();

// Configure printer (works cross-platform if printer is installed in the OS)
const printer = new ThermalPrinter({
  type: PrinterTypes.TSC, // For label printers like Xprinter XP-350B
  interface: process.platform === "win32"
    ? "printer:Xprinter XP-350B" // Windows installed printer name
    : "printer:Xprinter_XP_350B", // macOS/Linux CUPS printer name
  options: {
    timeout: 5000
  },
  width: 48,
  characterSet: "SLOVENIA", // doesn't matter for barcode only
});

router.post("/", async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).send("No barcode code provided");
  }

  try {
    // Clear buffer
    printer.clear();

    // TSC label commands
    printer.raw(`
      SIZE 40 mm,30 mm
      GAP 2 mm,0 mm
      CLS
      BARCODE 50,50,"128",100,1,0,2,2,"${code}"
      PRINT 1,1
    `);

    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      return res.status(500).send("Printer not connected");
    }

    const success = await printer.execute();
    if (success) {
      res.send("Printed successfully");
    } else {
      res.status(500).send("Failed to send print job");
    }
  } catch (err) {
    console.error("Print error:", err);
    res.status(500).send("Print failed");
  }
});

module.exports = router;
