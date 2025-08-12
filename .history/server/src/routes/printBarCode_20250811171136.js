// server/src/routes/printBarCode.js
const express = require("express");
const ThermalPrinter = require("node-thermal-printer").default;
const { PrinterTypes, CharacterSet, BreakLine } = require("node-thermal-printer");
const os = require("os");

const router = express.Router();

router.post("/", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).send("No code provided");

  let interfacePath;

  // Detect OS and choose interface path
  const platform = os.platform();
  if (platform === "win32") {
    // Windows: Use printer name
    interfacePath = "printer:Xprinter XP-350B";
  } else if (platform === "darwin") {
    // macOS: CUPS printer name
    interfacePath = "printer:Xprinter_XP_350B";
  } else {
    // Linux: Usually USB device path
    interfacePath = "/dev/usb/lp0";
  }

  try {
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON, // Most Xprinter models emulate Epson ESC/POS
      interface: interfacePath,
      characterSet: CharacterSet.PC852,
      removeSpecialCharacters: false,
      lineCharacter: "=",
      breakLine: BreakLine.WORD,
    });

    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      return res.status(500).send("Printer not connected");
    }

    printer.println(`Barcode: ${code}`);
    printer.cut();

    await printer.execute();
    res.send("Print job sent");
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

module.exports = router;
