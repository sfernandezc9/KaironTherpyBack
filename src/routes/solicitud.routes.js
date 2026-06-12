const router = require('express').Router();
const ctrl = require('../controllers/solicitud.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const adminOnly = [authenticate, authorize('administrador')];

router.get('/',              authenticate,  ctrl.getAll);
router.post('/',             authenticate, authorize('terapeuta'), ctrl.create);
router.put('/:id/aprobar',   ...adminOnly,  ctrl.aprobar);
router.put('/:id/rechazar',  ...adminOnly,  ctrl.rechazar);

module.exports = router;
