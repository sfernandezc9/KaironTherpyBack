const multer = require('multer');
const path = require('path');

const ALLOWED_EXT = ['.pdf', '.doc', '.docx'];
const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXT.includes(ext) && ALLOWED_MIME.includes(file.mimetype)) {
    return cb(null, true);
  }
  const err = new Error('Tipo de archivo no permitido. Sube un PDF o Word.');
  err.status = 400;
  cb(err);
}

module.exports = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});
