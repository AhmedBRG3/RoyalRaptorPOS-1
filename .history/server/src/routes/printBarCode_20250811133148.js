const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");

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

  exec("lpstat -p -d", (err, stdout, stderr) => {
    if (err) {
      console.error("Error listing printers:", err, stderr);
      return;
    }
    console.log("Available printers:\n", stdout);
  });s

  fs.writeFileSync("/tmp/barcode.txt", tspl);

  exec(
    `lp -d "Xprinter_XP_350B" -o raw /tmp/barcode.txt`,
    (err, stdout, stderr) => {
      if (err) {
        console.error("Print error:", err, stderr);
        return res.status(500).send("Print failed");
      }
      console.log("Print job sent:", stdout);
      res.send("Printed successfully");
    }
  );
});

module.exports = router;
