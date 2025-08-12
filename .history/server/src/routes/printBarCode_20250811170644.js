const express = require("express");
const ThermalPrinter = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;

const router = express.Router();

router.post("/", async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).send("No barcode code provided");
  }

  try {
    // Configure printer
    let printer = new ThermalPrinter({
      type: PrinterTypes.TSC, // TSC for label printers (XP-350B is TSC-compatible)
      interface: "printer:Xprinter_XP_350B", // or 'usb://...' or 'tcp://IP'
      options: { timeout: 5000 },
    });

    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      return res.status(500).send("Printer not connected");
    }

    // Build the label
    printer.clear();
    printer.setPrintWidth(400); // Adjust width if needed
    printer.barcode(code, printer.BARCODE_CODE128, {
      width: 2,
      height: 100,
      position: "BELOW", // show text under barcode
    });

    printer.cut(); // optional
    await printer.execute();

    res.send("Printed successfully");
  } catch (err) {
    console.error("Printing error:", err);
    res.status(500).send("Print failed");
  }
});

module.exports = router;
