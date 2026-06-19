const router = require('express').Router();
const ctrl = require('../controllers/terapeuta.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const adminOnly = [authenticate, authorize('administrador')];

router.get('/',                                       ...adminOnly, ctrl.getAll);
router.get('/:id',                                    ...adminOnly, ctrl.getById);
router.get('/:id/sucursales',                         ...adminOnly, ctrl.getSucursales);
router.get('/:id/sesiones',                           ...adminOnly, ctrl.getSesiones);
router.get('/:id/informe',                            ...adminOnly, ctrl.getInforme);
router.post('/',                                      ...adminOnly, ctrl.create);
router.post('/:id/sucursales',                        ...adminOnly, ctrl.asignarSucursal);
router.put('/:id',                                    ...adminOnly, ctrl.update);
router.put('/:id/sucursales/:id_sucursal/desasignar', ...adminOnly, ctrl.desasignarSucursal);
router.delete('/:id',                                 ...adminOnly, ctrl.remove);

module.exports = router;
