import ThermalPrinter from "node-thermal-printer";
import os from "os";

async function printBarcode(barcodeText) {
  let printerInterface;

  // Auto-detect OS and set interface
  if (os.platform() === "win32") {
    // Windows printers are usually accessible via shared name
    printerInterface = `printer:Xprinter XP-350B`;
  } else if (os.platform() === "darwin") {
    // macOS CUPS interface
    printerInterface = `printer:Xprinter_XP-350B`;
  } else {
    // Linux CUPS or USB path
    printerInterface = `printer:Xprinter_XP-350B`;
  }

  // Configure printer
  let printer = new ThermalPrinter.printer({
    type: ThermalPrinter.types.EPSON, // XP-350B uses ESC/POS
    interface: printerInterface,
    driver: require("printer"), // v4+ uses external printer driver
  });

  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    console.error("Printer not connected.");
    return;
  }

  // Print content
  printer.alignCenter();
  printer.println("Barcode:");
  printer.code128(barcodeText, {
    height: 80,
    width: 3,
    text: barcodeText,
  });
  printer.cut();

  try {
    await printer.execute();
    console.log("Print job sent successfully.");
  } catch (err) {
    console.error("Print failed:", err);
  }
}

// Example usage:
printBarcode("123456789012");
