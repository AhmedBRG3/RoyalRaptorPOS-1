import express from "express";
import os from "os";
import { printer as ThermalPrinter, types as PrinterTypes } from "node-thermal-printer";

const router = express.Router();

router.post("/", async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  try {
    // Detect OS and configure interface
    let interfacePath;
    if (os.platform() === "win32") {
      // Windows uses printer name
      interfacePath = "printer:Xprinter XP-350B";
    } else if (os.platform() === "darwin") {
      // macOS uses CUPS name
      interfacePath = "printer:Xprinter_XP-350B";
    } else {
      // Linux (direct USB or /dev/usb/lp0 path)
      interfacePath = "printer:Xprinter_XP-350B";
    }

    // Create printer instance
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON, // Xprinter is ESC/POS compatible
      interface: interfacePath,
      options: {
        timeout: 5000,
      },
    });

    // Test connection
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      return res.status(500).json({ error: "Printer not connected" });
    }

    // Print barcode
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

export default router;
