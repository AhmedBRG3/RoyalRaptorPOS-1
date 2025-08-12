const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const router = express.Router();

router.post("/", (req, res) => {
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

  // Pick a temp file path depending on OS
  const tmpFile = path.join(os.tmpdir(), "barcode.txt");
  fs.writeFileSync(tmpFile, tspl);

  const platform = os.platform(); // 'win32', 'darwin', 'linux'

  let listPrintersCmd;
  let printCmd;

  if (platform === "win32") {
    // Windows
    listPrintersCmd = `wmic printer get name`;
    const printerName = "Xprinter_XP_350B"; // EXACT name from wmic output
    printCmd = `print /D:"${printerName}" "${tmpFile}"`;
  } else {
    // macOS / Linux
    listPrintersCmd = `lpstat -p -d`;
    const printerName = "Xprinter_XP_350B"; // EXACT name from lpstat output
    printCmd = `lp -d "${printerName}" -o raw "${tmpFile}"`;
  }

  // List printers (for debugging)
  exec(listPrintersCmd, (err, stdout, stderr) => {
    if (err) {
      console.error("Error listing printers:", err, stderr);
    } else {
      console.log("Available printers:\n", stdout);
    }
  });

  // Print the file
  exec(printCmd, (err, stdout, stderr) => {
    if (err) {
      console.error("Print error:", err, stderr);
      return res.status(500).send("Print failed");
    }
    console.log("Print job sent:", stdout);
    res.send("Printed successfully");
  });
});

module.exports = router;
