const express = require("express");
const os = require("os");
const { execSync } = require("child_process");
const { printer: ThermalPrinter, types: PrinterTypes } = require("node-thermal-printer");

const router = express.Router();

// Function to find the first printer with "xprint" in its name
function findXPrinter() {
  const platform = os.platform();
  
  try {
    let printers = [];
    
    switch (platform) {
      case "win32":
        // Windows: Use wmic to list printers
        const winOutput = execSync('wmic printer get name', { encoding: 'utf8' });
        printers = winOutput
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && line !== 'Name')
          .filter(name => name.toLowerCase().includes('xprint'));
        break;
        
      case "darwin":
      case "linux":
      default:
        // macOS/Linux: Use lpstat to list printers
        const unixOutput = execSync('lpstat -p 2>/dev/null || echo "No printers"', { encoding: 'utf8' });
        printers = unixOutput
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('printer'))
          .map(line => line.split(' ')[1])
          .filter(name => name && name.toLowerCase().includes('xprint'));
        break;
    }
    
    if (printers.length === 0) {
      throw new Error('No printer with "xprint" in name found');
    }
    
    const selectedPrinter = printers[0];
    console.log(`Found XPrinter: ${selectedPrinter}`);
    
    return `printer:${selectedPrinter}`;
    
  } catch (error) {
    console.error('Error finding XPrinter:', error.message);
    
    // Fallback to common XPrinter names based on platform
    switch (platform) {
      case "win32":
        return "printer:XP-350B";
      case "darwin":
        return "printer:Xprinter_XP_350B";
      case "linux":
      default:
        return "printer:Xprinter_XP_350B";
    }
  }
}

// Function to get the correct printer interface path
function getPrinterInterface() {
  return findXPrinter();
}

// Function to validate barcode content
function isValidBarcode(code, type = 'CODE128') {
  if (!code || typeof code !== 'string') return false;
  
  // Basic validation - adjust based on your barcode type requirements
  switch (type) {
    case 'CODE128':
      return code.length > 0 && code.length <= 80;
    case 'EAN13':
      return /^\d{13}$/.test(code);
    case 'UPC':
      return /^\d{12}$/.test(code);
    default:
      return code.length > 0;
  }
}

router.post("/", async (req, res) => {
  const { code, barcodeType = 'CODE128', copies = 1 } = req.body;

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
    const interfacePath = getPrinterInterface();
    
    // Create printer instance with better error handling
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON, // Most thermal printers are EPSON compatible
      interface: interfacePath,
      options: {
        timeout: 10000, // Increased timeout for better reliability
      },
      width: 48, // Standard width for most thermal printers
      characterSet: 'PC437_USA', // Standard character set
    });

    // Check printer connection with timeout
    const isConnected = await Promise.race([
      printer.isPrinterConnected(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      )
    ]);

    if (!isConnected) {
      return res.status(500).json({ 
        error: "Printer not connected",
        suggestion: "Please check if the printer is powered on and properly connected"
      });
    }

    // Print multiple copies if requested
    for (let i = 0; i < copies; i++) {
      // Initialize printer
      printer.clear();
      
      // Set alignment and font
      printer.alignCenter();
      printer.setTextSize(1, 1);
      
      // Add some spacing
      printer.newLine();
      
      // Print barcode with error handling for different types
      try {
        switch (barcodeType.toUpperCase()) {
          case 'CODE128':
            printer.code128(code, { width: 'LARGE', height: 60 });
            break;
          case 'EAN13':
            printer.printBarcode(code, 80); // Generic barcode method
            break;
          case 'UPC':
            printer.printBarcode(code, 80);
            break;
          default:
            printer.code128(code, { width: 'LARGE', height: 60 });
        }
      } catch (barcodeError) {
        // Fallback to generic barcode method
        printer.printBarcode(code, 80);
      }
      
      // Add text below barcode
      printer.newLine();
      printer.alignCenter();
      printer.setTextSize(0, 0); // Smaller text
      printer.println(code);
      printer.newLine();
      
      // Add copy number if printing multiple copies
      if (copies > 1) {
        printer.println(`Copy ${i + 1} of ${copies}`);
        printer.newLine();
      }
      
      // Cut paper (partial cut to avoid jamming)
      if (i < copies - 1) {
        printer.partialCut();
      } else {
        printer.cut();
      }
    }

    // Execute print job with retry mechanism
    let retries = 3;
    let lastError;
    
    while (retries > 0) {
      try {
        await printer.execute();
        break;
      } catch (executeError) {
        lastError = executeError;
        retries--;
        if (retries > 0) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (retries === 0) {
      throw lastError;
    }

    res.json({ 
      success: true, 
      message: `Barcode printed successfully (${copies} cop${copies === 1 ? 'y' : 'ies'})`,
      code: code,
      type: barcodeType
    });

  } catch (err) {
    console.error('Printer error:', err);
    
    // Provide more specific error messages
    let errorMessage = err.message;
    if (err.message.includes('ENOENT') || err.message.includes('not found')) {
      errorMessage = "Printer not found. Please check printer name and connection.";
    } else if (err.message.includes('timeout')) {
      errorMessage = "Printer connection timeout. Please check if printer is ready.";
    } else if (err.message.includes('Permission denied')) {
      errorMessage = "Permission denied. Please check printer permissions.";
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Health check endpoint with printer discovery
router.get("/status", async (req, res) => {
  try {
    const interfacePath = getPrinterInterface();
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: interfacePath,
      options: { timeout: 5000 },
    });

    const isConnected = await printer.isPrinterConnected();
    
    // Also try to list all available XPrinters
    let availableXPrinters = [];
    try {
      const platform = os.platform();
      let printers = [];
      
      switch (platform) {
        case "win32":
          const winOutput = execSync('wmic printer get name', { encoding: 'utf8' });
          printers = winOutput
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && line !== 'Name')
            .filter(name => name.toLowerCase().includes('xprint'));
          break;
          
        case "darwin":
        case "linux":
        default:
          const unixOutput = execSync('lpstat -p 2>/dev/null || echo "No printers"', { encoding: 'utf8' });
          printers = unixOutput
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('printer'))
            .map(line => line.split(' ')[1])
            .filter(name => name && name.toLowerCase().includes('xprint'));
          break;
      }
      
      availableXPrinters = printers;
    } catch (discoverError) {
      console.error('Printer discovery error:', discoverError.message);
    }
    
    res.json({
      printer: {
        connected: isConnected,
        interface: interfacePath,
        platform: os.platform(),
        availableXPrinters: availableXPrinters,
        selectedPrinter: interfacePath.replace('printer:', '')
      }
    });
  } catch (err) {
    res.status(500).json({
      error: "Unable to check printer status",
      details: err.message
    });
  }
});

module.exports = router;