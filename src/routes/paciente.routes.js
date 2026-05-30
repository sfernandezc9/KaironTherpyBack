const router = require('express').Router();
const ctrl = require('../controllers/paciente.controller');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.get('/:id/ficha', ctrl.getFicha);
router.get('/:id/sesiones', ctrl.getSesiones);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
