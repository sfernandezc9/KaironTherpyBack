const router = require('express').Router();
const ctrl = require('../controllers/stock.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const adminOnly = [authenticate, authorize('administrador')];

router.get('/',              ...adminOnly, ctrl.getAll);
router.get('/bajo-minimo',   ...adminOnly, ctrl.getStockBajo);
router.get('/:id',           ...adminOnly, ctrl.getById);
router.post('/',             ...adminOnly, ctrl.create);
router.patch('/:id/ajustar', ...adminOnly, ctrl.ajustarCantidad);
router.put('/:id',           ...adminOnly, ctrl.update);
router.delete('/:id',        ...adminOnly, ctrl.remove);

module.exports = router;
