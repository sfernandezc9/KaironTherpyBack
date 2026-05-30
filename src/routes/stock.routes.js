const router = require('express').Router();
const ctrl = require('../controllers/stock.controller');

router.get('/', ctrl.getAll);
router.get('/bajo-minimo', ctrl.getStockBajo);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.patch('/:id/ajustar', ctrl.ajustarCantidad);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
