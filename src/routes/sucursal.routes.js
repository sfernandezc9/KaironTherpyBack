const router = require('express').Router();
const ctrl = require('../controllers/sucursal.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const adminOnly = [authenticate, authorize('administrador')];

router.get('/',               ...adminOnly, ctrl.getAll);
router.get('/:id',            ...adminOnly, ctrl.getById);
router.get('/:id/terapeutas',  ...adminOnly,   ctrl.getTerapeutas);
router.get('/:id/stock',       ...adminOnly,   ctrl.getStock);
router.get('/:id/pacientes',   authenticate,   ctrl.getPacientes);
router.post('/',              ...adminOnly, ctrl.create);
router.put('/:id',            ...adminOnly, ctrl.update);
router.delete('/:id',         ...adminOnly, ctrl.remove);

// Responsables
router.get('/:id/responsables',              ...adminOnly, ctrl.getResponsables);
router.post('/:id/responsables',             ...adminOnly, ctrl.createResponsable);
router.put('/:id/responsables/:id_resp',     ...adminOnly, ctrl.updateResponsable);
router.delete('/:id/responsables/:id_resp',  ...adminOnly, ctrl.removeResponsable);

module.exports = router;
