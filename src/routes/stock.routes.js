const router = require('express').Router();
const ctrl = require('../controllers/stock.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const adminOnly = [authenticate, authorize('administrador')];

// ─── Stock proveedor ──────────────────────────────────────────────────────────
router.get('/proveedor',                    ...adminOnly, ctrl.getProveedorAll);
router.get('/proveedor/bajo-minimo',        ...adminOnly, ctrl.getProveedorBajoMinimo);
router.get('/proveedor/:id',               ...adminOnly, ctrl.getProveedorById);
router.post('/proveedor',                   ...adminOnly, ctrl.createProveedor);
router.patch('/proveedor/:id/ajustar',      ...adminOnly, ctrl.ajustarProveedor);

// ─── Transferencias proveedor → sucursal ─────────────────────────────────────
router.post('/transferir',                  ...adminOnly, ctrl.transferir);
router.get('/transferencias',               ...adminOnly, ctrl.getTransferencias);

// ─── Stock sucursal ───────────────────────────────────────────────────────────
router.get('/',              ...adminOnly, ctrl.getAll);
router.get('/bajo-minimo',   ...adminOnly, ctrl.getStockBajo);
router.get('/:id',           ...adminOnly, ctrl.getById);
router.post('/',             ...adminOnly, ctrl.create);
router.patch('/:id/ajustar', ...adminOnly, ctrl.ajustarCantidad);
router.put('/:id',           ...adminOnly, ctrl.update);
router.delete('/:id',        ...adminOnly, ctrl.remove);

module.exports = router;
