const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/sesiones');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, _file, cb) => {
    const ext = path.extname(_file.originalname).toLowerCase();
    cb(null, `sesion_${req.params.id}_${Date.now()}${ext}`);
  }
});

module.exports = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});
