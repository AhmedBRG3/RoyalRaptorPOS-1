import express from "express";
import { exec } from "child_process";
import fs from "fs";

const router = express.Router();

// POST /print-barcode
router.post("/", (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).send("No barcode code provided");
  }

  // TSPL commands for XP-350B
  const tspl = `
SIZE 40 mm,30 mm
GAP 2 mm,0 mm
CLS
BARCODE 50,50,"128",100,1,0,2,2,"${code}"
PRINT 1,1
`;

  // Save to a temporary file
  fs.writeFileSync("/tmp/barcode.txt", tspl);

  // Change XP-350B to your printer's actual name in System Settings > Printers
  exec(`lp -d "XP-350B" -o raw /tmp/barcode.txt`, (err, stdout, stderr) => {
    if (err) {
      console.error("Print error:", err, stderr);
      return res.status(500).send("Print failed");
    }
    console.log("Print job sent:", stdout);
    res.send("Printed successfully");
  });
});

module.exports = router;
