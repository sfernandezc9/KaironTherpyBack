const router = require('express').Router();
const ctrl = require('../controllers/terapeuta.controller');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.get('/:id/sucursales', ctrl.getSucursales);
router.get('/:id/sesiones', ctrl.getSesiones);
router.post('/', ctrl.create);
router.post('/:id/sucursales', ctrl.asignarSucursal);
router.put('/:id', ctrl.update);
router.put('/:id/sucursales/:id_sucursal/desasignar', ctrl.desasignarSucursal);
router.delete('/:id', ctrl.remove);

module.exports = router;
