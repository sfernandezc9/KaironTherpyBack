const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.post('/login', ctrl.login);
router.get('/me', authenticate, ctrl.me);

// Solo admin gestiona usuarios
router.get('/usuarios', authenticate, authorize('administrador'), ctrl.getAll);
router.post('/usuarios', authenticate, authorize('administrador'), ctrl.create);
router.put('/usuarios/:id/desactivar', authenticate, authorize('administrador'), ctrl.deactivate);

// Cambio de contraseña: admin puede cambiar cualquiera, terapeuta solo la suya
router.put('/usuarios/:id/password', authenticate, ctrl.changePassword);

module.exports = router;
