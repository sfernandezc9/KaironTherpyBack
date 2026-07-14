const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/sesiones');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Tipos permitidos para adjuntos de sesión
const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'];
const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, _file, cb) => {
    // Solo se usa una extensión saneada de la lista blanca, nunca el nombre del cliente
    const ext = path.extname(_file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXT.includes(ext) ? ext : '';
    cb(null, `sesion_${req.params.id}_${Date.now()}${safeExt}`);
  }
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXT.includes(ext) && ALLOWED_MIME.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error('Tipo de archivo no permitido'));
}

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});
