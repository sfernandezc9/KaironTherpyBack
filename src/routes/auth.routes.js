const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

// Anti fuerza bruta: 10 intentos de login por IP cada 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta más tarde.' },
});

router.post('/login', loginLimiter, ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', authenticate, ctrl.me);

// Solo admin gestiona usuarios
router.get('/usuarios', authenticate, authorize('administrador'), ctrl.getAll);
router.post('/usuarios', authenticate, authorize('administrador'), ctrl.create);
router.put('/usuarios/:id/desactivar', authenticate, authorize('administrador'), ctrl.deactivate);

// Cambio de contraseña: admin puede cambiar cualquiera, terapeuta solo la suya
router.put('/usuarios/:id/password', authenticate, ctrl.changePassword);

module.exports = router;
