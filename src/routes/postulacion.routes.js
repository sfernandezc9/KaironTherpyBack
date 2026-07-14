const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/postulacion.controller');
const uploadCv = require('../middleware/uploadCv');

// Anti-abuso: 10 postulaciones por IP cada 15 minutos
const postulacionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas postulaciones desde esta IP. Intenta más tarde.' },
});

router.post('/', postulacionLimiter, uploadCv.single('cv'), ctrl.create);

module.exports = router;
