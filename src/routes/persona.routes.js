const router = require('express').Router();
const ctrl = require('../controllers/persona.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const adminOnly = [authenticate, authorize('administrador')];

router.get('/',    authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getById);
router.post('/',   ...adminOnly,  ctrl.create);
router.put('/:id', ...adminOnly,  ctrl.update);
router.delete('/:id', ...adminOnly, ctrl.remove);

module.exports = router;
