const express = require('express');
const multer = require('multer');
const tarToZip = require('./lib/tar-to-zip');  // ✅ Changed: Use local library file
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

function logError(location, err) {
  console.error(`[ERROR][${location}] ${(err && err.stack) ? err.stack : err}`);
  fs.appendFileSync('api-error.log', `[${new Date().toISOString()}] [${location}] ${err}\n`);
}

app.post('/convert', upload.single('file'), async (req, res) => {
  const inputPath = req.file ? req.file.path : null;
  const outputPath = path.join(__dirname, 'output.zip');

  if (!inputPath) {
    logError('upload', 'No file uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const zipStream = tarToZip(fs.createReadStream(inputPath));
    const writeStream = fs.createWriteStream(outputPath);

    zipStream.on('error', err => {
      logError('tarToZip', err);
      res.status(500).json({ error: 'Conversion failed', details: err.message });
      fs.unlink(inputPath, () => {});
      if (fs.existsSync(outputPath)) fs.unlink(outputPath, () => {});
    });

    writeStream.on('finish', () => {
      res.download(outputPath, 'converted.zip', err => {
        if (err) {
          logError('sendZip', err);
          res.status(500).json({ error: 'Download failed', details: err.message });
        }
        fs.unlink(inputPath, () => {});
        fs.unlink(outputPath, () => {});
      });
    });

    writeStream.on('error', err => {
      logError('writeStream', err);
      res.status(500).json({ error: 'ZIP write failed', details: err.message });
      fs.unlink(inputPath, () => {});
      if (fs.existsSync(outputPath)) fs.unlink(outputPath, () => {});
    });

    zipStream.pipe(writeStream);
  } catch (err) {
    logError('catch', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
    if (inputPath) fs.unlink(inputPath, () => {});
    if (fs.existsSync(outputPath)) fs.unlink(outputPath, () => {});
  }
});

app.use((err, req, res, next) => {
  logError('express', err);
  res.status(500).json({ error: 'Global error handler', details: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('API running on port', PORT);
});
