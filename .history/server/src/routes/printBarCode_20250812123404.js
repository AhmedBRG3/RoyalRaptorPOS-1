import express from "express";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

const router = express.Router();

router.post("/", (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Barcode 'code' is required" });
  }

  // Step 1 — Find first Xprinter in printer list
  exec("lpstat -p | awk '{print $2}' | grep -i xprinter | head -n 1", (err, printerName) => {
    if (err || !printerName.trim()) {
      console.error("Printer detection error:", err || "No Xprinter found");
      return res.status(500).json({ error: "No Xprinter printer found" });
    }

    const printer = printerName.trim();
    console.log("Using printer:", printer);

    // Step 2 — Create TSPL command
    const tspl = `
SIZE 40 mm,30 mm
GAP 2 mm,0
DENSITY 8
SPEED 4
CODEPAGE UTF-8
DIRECTION 1
REFERENCE 0,0
CLS
BARCODE 50,50,"128",100,1,0,2,2,"${code}"
PRINT 1
`;

    // Step 3 — Save to local file
    const filePath = path.join(process.cwd(), "barcode.txt");
    try {
      fs.writeFileSync(filePath, tspl, "utf8");
    } catch (err) {
      console.error("Error saving barcode file:", err);
      return res.status(500).json({ error: "Failed to save TSPL file" });
    }

    // Step 4 — Send to printer using lpr
    const printCommand = `lpr -P "${printer}" -o raw "${filePath}"`;
    exec(printCommand, (err, stdout, stderr) => {
      if (err) {
        console.error("Printing error:", err);
        return res.status(500).json({ error: "Failed to send to printer" });
      }

      console.log("Barcode sent to printer successfully.");
      res.json({ success: true, message: "Barcode printed successfully" });
    });
  });
});

export default router;
