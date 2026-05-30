const router = require('express').Router();
const ctrl = require('../controllers/historial.controller');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

module.exports = router;
