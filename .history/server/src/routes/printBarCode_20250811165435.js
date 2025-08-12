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

  const tmpFile = path.join(os.tmpdir(), "barcode.txt");
  fs.writeFileSync(tmpFile, tspl);

  const platform = os.platform();
  let listPrintersCmd;
  let printCmd;

  if (platform === "win32") {
    listPrintersCmd = `wmic printer get name`;
    const printerName = "Xprinter_XP_350B"; // match exactly from wmic output
    printCmd = `print /D:"${printerName}" "${tmpFile}"`;
  } else {
    listPrintersCmd = `lpstat -p -d`;
    const printerName = "Xprinter_XP_350B";
    printCmd = `lp -d "${printerName}" -o raw "${tmpFile}"`;
  }

  exec(listPrintersCmd, (err, stdout) => {
    if (err) {
      console.error("Error listing printers:", err);
    } else {
      console.log("Available printers:\n", stdout);
    }

    exec(printCmd, (err, stdout, stderr) => {
      if (err) {
        console.error("Print error:", err, stderr);
        return res.status(500).send("Print failed");
      }
      console.log("Print job sent:", stdout);
      res.send("Printed successfully");
    });
  });
});

module.exports = router;
