const express = require('express');
const multer = require('multer');
const tarToZip = require('tar-to-zip');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/convert', upload.single('file'), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const outputPath = path.join(__dirname, 'output.zip');

    // Convert tar.gz to zip stream
    const zipStream = tarToZip(fs.createReadStream(inputPath))
      .on('error', (err) => res.status(500).send(err.message));

    const writeStream = fs.createWriteStream(outputPath);
    zipStream.pipe(writeStream);

    writeStream.on('finish', () => {
      res.download(outputPath, 'converted.zip', (err) => {
        if (err) res.status(500).send('Conversion failed');
        // Cleanup
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      });
    });
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});

app.listen(3000, () => console.log('API running on port 3000'));
