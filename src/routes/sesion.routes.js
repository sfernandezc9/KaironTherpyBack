const router = require('express').Router();
const ctrl = require('../controllers/sesion.controller');
const authenticate = require('../middleware/authenticate');

// Ambos roles pueden crear/modificar sesiones (terapeuta gestiona las propias)
router.get('/stock-sucursal/:id_sucursal', authenticate, ctrl.getStockSucursal);
router.get('/',                        authenticate, ctrl.getAll);
router.get('/:id',                     authenticate, ctrl.getById);
router.get('/:id/insumos',             authenticate, ctrl.getInsumos);
router.post('/',                       authenticate, ctrl.create);
router.post('/:id/insumos',            authenticate, ctrl.addInsumo);
router.put('/:id',                     authenticate, ctrl.update);
router.delete('/:id',                  authenticate, ctrl.remove);
router.delete('/:id/insumos/:id_uso',  authenticate, ctrl.removeInsumo);

module.exports = router;
