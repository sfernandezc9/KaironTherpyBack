const router = require('express').Router();
const ctrl = require('../controllers/sucursal.controller');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.get('/:id/terapeutas', ctrl.getTerapeutas);
router.get('/:id/stock', ctrl.getStock);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
