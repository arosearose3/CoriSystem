import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

const metadataFilePath = path.join(__dirname, 'exclusionUploadFileData.json');

// Helper function to update metadata JSON file
function updateMetadata(fileType, fileName) {
  const data = fs.existsSync(metadataFilePath) 
    ? JSON.parse(fs.readFileSync(metadataFilePath)) 
    : {};

  data[fileType] = {
    fileName,
    uploadedAt: new Date().toISOString(),
  };

  fs.writeFileSync(metadataFilePath, JSON.stringify(data, null, 2));
}

// Route to upload OIG file
router.post('/upload/OIG', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded' });
  }

  // Update the metadata with the new file name
  updateMetadata('oig', req.file.filename);

  res.status(200).send({ message: 'OIG file uploaded successfully!' });
});

// Route to upload SAMHSA file
router.post('/upload/SAMHSA', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded' });
  }

  // Update the metadata with the new file name
  updateMetadata('sam', req.file.filename);

  res.status(200).send({ message: 'SAMHSA file uploaded successfully!' });
});

// Route to upload Colorado file
router.post('/upload/CO', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded' });
  }

  // Update the metadata with the new file name
  updateMetadata('co', req.file.filename);

  res.status(200).send({ message: 'Colorado file uploaded successfully!' });
});

export default router;
