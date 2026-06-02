const router = require('express').Router();
const ctrl = require('../controllers/historial.controller');
const authenticate = require('../middleware/authenticate');

router.get('/',    authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getById);

module.exports = router;
