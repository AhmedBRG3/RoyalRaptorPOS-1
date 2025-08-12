const express = require("express");
const os = require("os");
const { printer: ThermalPrinter, types: PrinterTypes } = require("node-thermal-printer");

const router = express.Router();

router.post("/", async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  try {
    let interfacePath;
    if (os.platform() === "win32") {
      interfacePath = "printer:Xprinter XP-350B"; // Use exact printer name on Windows
    } else if (os.platform() === "darwin") {
      interfacePath = "printer:Xprinter_XP-350B"; // macOS CUPS name
    } else {
      interfacePath = "printer:Xprinter_XP-350B"; // Linux or others
    }

    // *** Important: use new here ***
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: interfacePath,
      options: { timeout: 5000 },
    });

    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      return res.status(500).json({ error: "Printer not connected" });
    }

    printer.alignCenter();
    printer.barcode(code, 80);
    printer.newLine();
    printer.cut();

    await printer.execute();

    res.json({ success: true, message: "Barcode printed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
