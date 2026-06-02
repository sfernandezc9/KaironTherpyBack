const router = require('express').Router();
const ctrl = require('../controllers/fichaClinica.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const adminOnly = [authenticate, authorize('administrador')];

router.get('/',             authenticate, ctrl.getAll);
router.get('/:id',          authenticate, ctrl.getById);
router.get('/:id/historial',authenticate, ctrl.getHistorial);
// Solo admin crea ficha; terapeuta puede actualizar
router.post('/',            ...adminOnly,  ctrl.create);
router.put('/:id',          authenticate, ctrl.update);

module.exports = router;
