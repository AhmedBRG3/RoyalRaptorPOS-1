const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const router = express.Router();

// Function to find the first printer with "xprint" in its name
function findXPrinter() {
  const platform = os.platform();

  try {
    let printers = [];

    switch (platform) {
      case "win32":
        // Windows: Use wmic to list printers and get exact names
        const winOutput = execSync("wmic printer get name /format:csv", {
          encoding: "utf8",
        });
        printers = winOutput
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.includes(","))
          .map((line) => line.split(",")[1])
          .filter((name) => name && name !== "Name")
          .filter((name) => name.toLowerCase().includes("xprint"));

        // Also try PowerShell method as backup
        if (printers.length === 0) {
          try {
            const psOutput = execSync(
              "powershell \"Get-Printer | Where-Object {$_.Name -like '*xprint*'} | Select-Object -ExpandProperty Name\"",
              { encoding: "utf8" }
            );
            printers = psOutput
              .split("\n")
              .map((line) => line.trim())
              .filter((name) => name && name.toLowerCase().includes("xprint"));
          } catch (psError) {
            console.warn(
              "PowerShell printer detection failed:",
              psError.message
            );
          }
        }
        break;

      case "darwin":
      case "linux":
      default:
        // macOS/Linux: Use lpstat to list printers
        const unixOutput = execSync(
          'lpstat -p 2>/dev/null || echo "No printers"',
          { encoding: "utf8" }
        );
        printers = unixOutput
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("printer"))
          .map((line) => line.split(" ")[1])
          .filter((name) => name && name.toLowerCase().includes("xprint"));
        break;
    }

    if (printers.length === 0) {
      throw new Error('No printer with "xprint" in name found');
    }

    const selectedPrinter = printers[0];
    console.log(`Found XPrinter: "${selectedPrinter}"`);
    console.log(
      `All XPrinters found: [${printers.map((p) => `"${p}"`).join(", ")}]`
    );

    return selectedPrinter;
  } catch (error) {
    console.error("Error finding XPrinter:", error.message);

    // Fallback to common XPrinter names based on platform
    switch (platform) {
      case "win32":
        return "Xprinter XP-350B";
      case "darwin":
        return "Xprinter_XP_350B";
      case "linux":
      default:
        return "Xprinter_XP_350B";
    }
  }
}

// Function to validate barcode content
function isValidBarcode(code, type = "CODE128") {
  if (!code || typeof code !== "string") return false;

  // Basic validation - adjust based on your barcode type requirements
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

// Function to generate TSPL barcode content
// Function to generate TSPL barcode content
function generateTSPL(code, barcodeType = "EAN13", copies = 1) {
  return `SIZE 40 mm,30 mm
GAP 2 mm,0 mm
CLS
BARCODE 50,50,"128",100,1,0,2,2,"${code}"
PRINT 1,1`;
}

router.post("/", (req, res) => {
  const { code, barcodeType = "CODE128", copies = 1 } = req.body;

  // Validate input
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
    // Find the XPrinter automatically
    const printerName = findXPrinter();

    // Generate TSPL commands
    const tspl = generateTSPL(code, barcodeType, copies);

    // Create temporary file
    const tmpFile = path.join(os.tmpdir(), `barcode_${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, tspl);

    const platform = os.platform();
    let listPrintersCmd;
    let printCmd;
    
    if (platform === "win32") {
      // Get exact printer name (case-sensitive match)
      const winOutput = execSync("wmic printer get name", { encoding: "utf8" });
      const exactName = winOutput
        .split("\n")
        .map((line) => line.trim())
        .filter((name) => name.toLowerCase().includes("xprint"))[0];

      if (!exactName) {
        throw new Error("No XPrinter found on Windows");
      }

      const escapedPrinterName = exactName.replace(/"/g, '""');

      // Prefer lpr if available (raw mode)
      let lprAvailable = false;
      try {
        execSync("where lpr", { stdio: "ignore" });
        lprAvailable = true;
      } catch (e) {
        lprAvailable = false;
      }

      if (lprAvailable) {
        // Use LPR printing (requires "LPR Port Monitor" feature enabled)
        printCmd = `lpr -S localhost -P "${escapedPrinterName}" "${tmpFile}"`;
      } else {
        // Fallback: Windows print command
        // Must use exact name as in Control Panel → Devices and Printers
        printCmd = `print /D:"${escapedPrinterName}" "${tmpFile}"`;
      }
    }

    // List available printers (for debugging)
    exec(listPrintersCmd, (err, stdout) => {
      if (err) {
        console.error("Error listing printers:", err);
      } else {
        console.log("Available printers:\n", stdout);
      }

      // Execute print command
      exec(printCmd, (err, stdout, stderr) => {
        // Clean up temporary file
        fs.unlink(tmpFile, (unlinkErr) => {
          if (unlinkErr)
            console.error("Error cleaning up temp file:", unlinkErr);
        });

        if (err) {
          console.error("Print error:", err, stderr);

          // Provide more specific error messages
          let errorMessage = "Print failed";
          if (stderr && stderr.includes("not found")) {
            errorMessage = `Printer '${printerName}' not found. Please check if the printer is connected and configured.`;
          } else if (stderr && stderr.includes("Permission denied")) {
            errorMessage =
              "Permission denied. Please check printer permissions.";
          } else if (err.message.includes("ENOENT")) {
            errorMessage =
              "Print command not found. Please ensure printer drivers are installed.";
          }

          return res.status(500).json({
            error: errorMessage,
            details:
              process.env.NODE_ENV === "development" ? stderr : undefined,
          });
        }

        console.log("Print job sent:", stdout);
        res.json({
          success: true,
          message: `Barcode printed successfully (${copies} cop${
            copies === 1 ? "y" : "ies"
          })`,
          code: code,
          type: barcodeType,
          printer: printerName,
        });
      });
    });
  } catch (error) {
    console.error("Barcode printing error:", error);
    res.status(500).json({
      error: "Failed to process barcode print request",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Health check endpoint with printer discovery
router.get("/status", (req, res) => {
  try {
    const platform = os.platform();
    const printerName = findXPrinter();

    let listPrintersCmd;
    if (platform === "win32") {
      listPrintersCmd = `wmic printer get name`;
    } else {
      listPrintersCmd = `lpstat -p -d`;
    }

    exec(listPrintersCmd, (err, stdout) => {
      if (err) {
        return res.status(500).json({
          error: "Unable to list printers",
          details: err.message,
          platform: platform,
        });
      }

      // Extract available XPrinters from output
      let availableXPrinters = [];
      if (platform === "win32") {
        availableXPrinters = stdout
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line && line !== "Name")
          .filter((name) => name.toLowerCase().includes("xprint"));
      } else {
        availableXPrinters = stdout
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("printer"))
          .map((line) => line.split(" ")[1])
          .filter((name) => name && name.toLowerCase().includes("xprint"));
      }

      const isConnected = availableXPrinters.includes(printerName);

      res.json({
        printer: {
          connected: isConnected,
          selectedPrinter: printerName,
          platform: platform,
          availableXPrinters: availableXPrinters,
          systemOutput: stdout,
        },
      });
    });
  } catch (error) {
    res.status(500).json({
      error: "Unable to check printer status",
      details: error.message,
    });
  }
});

// Test print endpoint
router.post("/test", (req, res) => {
  const testCode = "TEST123456789";

  req.body = { code: testCode, barcodeType: "CODE128", copies: 1 };

  // Reuse the main print logic
  const mainRoute = router.stack.find(
    (layer) =>
      layer.route && layer.route.path === "/" && layer.route.methods.post
  );
  if (mainRoute) {
    mainRoute.route.stack[0].handle(req, res);
  } else {
    res.status(500).json({ error: "Test print failed - route not found" });
  }
});

// Windows printer debugging endpoint
router.get("/debug-windows", (req, res) => {
  if (os.platform() !== "win32") {
    return res.json({ error: "This endpoint is only for Windows" });
  }

  try {
    // Get printer info using multiple methods
    const wmicOutput = execSync(
      "wmic printer get name,drivername,portname /format:csv",
      { encoding: "utf8" }
    );
    const psOutput = execSync(
      'powershell "Get-Printer | Select-Object Name,DriverName,PortName | ConvertTo-Json"',
      { encoding: "utf8" }
    );

    let parsedPS = [];
    try {
      parsedPS = JSON.parse(psOutput);
      if (!Array.isArray(parsedPS)) {
        parsedPS = [parsedPS];
      }
    } catch (e) {
      parsedPS = [];
    }

    const xprinters = parsedPS.filter(
      (p) => p.Name && p.Name.toLowerCase().includes("xprint")
    );

    res.json({
      wmicRaw: wmicOutput,
      powershellPrinters: parsedPS,
      xprinters: xprinters,
      selectedPrinter: findXPrinter(),
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to get Windows printer debug info",
      details: error.message,
    });
  }
});

module.exports = router;
