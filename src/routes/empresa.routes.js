const router = require('express').Router();
const ctrl = require('../controllers/empresa.controller');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.get('/:id/sucursales', ctrl.getSucursales);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
