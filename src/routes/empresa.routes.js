const router = require('express').Router();
const ctrl = require('../controllers/empresa.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const adminOnly = [authenticate, authorize('administrador')];

router.get('/',                             ...adminOnly, ctrl.getAll);
router.get('/:id',                          ...adminOnly, ctrl.getById);
router.get('/:id/sucursales',               ...adminOnly, ctrl.getSucursales);
router.post('/',                            ...adminOnly, ctrl.create);
router.put('/:id',                          ...adminOnly, ctrl.update);
router.delete('/:id',                       ...adminOnly, ctrl.remove);

router.get('/:id/responsables',             ...adminOnly, ctrl.getResponsables);
router.post('/:id/responsables',            ...adminOnly, ctrl.createResponsable);
router.put('/:id/responsables/:id_resp',    ...adminOnly, ctrl.updateResponsable);
router.delete('/:id/responsables/:id_resp', ...adminOnly, ctrl.removeResponsable);

module.exports = router;
