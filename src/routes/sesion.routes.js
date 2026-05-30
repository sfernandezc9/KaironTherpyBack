const router = require('express').Router();
const ctrl = require('../controllers/sesion.controller');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.get('/:id/insumos', ctrl.getInsumos);
router.post('/', ctrl.create);
router.post('/:id/insumos', ctrl.addInsumo);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.delete('/:id/insumos/:id_uso', ctrl.removeInsumo);

module.exports = router;
