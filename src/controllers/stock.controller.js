const db = require('../config/db');

// ─── Stock sucursal ───────────────────────────────────────────────────────────

const getAll = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT si.*, i.nombre AS nombre_insumo, i.unidad_medida, s.nombre AS nombre_sucursal,
             CASE WHEN si.cantidad <= si.cantidad_minima THEN TRUE ELSE FALSE END AS stock_bajo
      FROM stock_insumo si
      JOIN insumo   i ON i.id_insumo   = si.id_insumo
      JOIN sucursal s ON s.id_sucursal = si.id_sucursal
      ORDER BY s.nombre, i.nombre
    `);
    res.json(rows);
  } catch (err) { next(err); }
};

const getStockBajo = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT si.*, i.nombre AS nombre_insumo, i.unidad_medida, s.nombre AS nombre_sucursal
      FROM stock_insumo si
      JOIN insumo   i ON i.id_insumo   = si.id_insumo
      JOIN sucursal s ON s.id_sucursal = si.id_sucursal
      WHERE si.cantidad <= si.cantidad_minima
      ORDER BY s.nombre, i.nombre
    `);
    res.json(rows);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT si.*, i.nombre AS nombre_insumo, i.unidad_medida, s.nombre AS nombre_sucursal
      FROM stock_insumo si
      JOIN insumo   i ON i.id_insumo   = si.id_insumo
      JOIN sucursal s ON s.id_sucursal = si.id_sucursal
      WHERE si.id_stock = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Stock no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { id_sucursal, id_insumo, cantidad_minima } = req.body;
    const [result] = await db.query(
      'INSERT INTO stock_insumo (id_sucursal, id_insumo, cantidad, cantidad_minima) VALUES (?, ?, 0, ?)',
      [id_sucursal, id_insumo, cantidad_minima ?? 0]
    );
    res.status(201).json({ id_stock: result.insertId });
  } catch (err) { next(err); }
};

// Solo permite delta negativo — stock positivo solo vía transferencia desde proveedor
const ajustarCantidad = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const { delta } = req.body;
    if (delta === undefined) return res.status(400).json({ error: 'Falta campo delta' });
    if (delta > 0) return res.status(400).json({ error: 'No se puede incrementar stock de sucursal directamente. Use POST /api/stock/transferir' });

    await conn.beginTransaction();
    const [[stock]] = await conn.query('SELECT cantidad FROM stock_insumo WHERE id_stock = ? FOR UPDATE', [req.params.id]);
    if (!stock) { await conn.rollback(); return res.status(404).json({ error: 'Stock no encontrado' }); }
    if (stock.cantidad + delta < 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Stock insuficiente para el ajuste', disponible: stock.cantidad });
    }

    await conn.query('UPDATE stock_insumo SET cantidad = cantidad + ? WHERE id_stock = ?', [delta, req.params.id]);
    await conn.commit();

    const [[updated]] = await conn.query('SELECT cantidad FROM stock_insumo WHERE id_stock = ?', [req.params.id]);
    res.json({ cantidad_nueva: updated.cantidad });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

const update = async (req, res, next) => {
  try {
    const { cantidad_minima } = req.body;
    const [result] = await db.query(
      'UPDATE stock_insumo SET cantidad_minima=? WHERE id_stock=?',
      [cantidad_minima, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Stock no encontrado' });
    res.json({ message: 'Stock actualizado' });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const [result] = await db.query('DELETE FROM stock_insumo WHERE id_stock = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Stock no encontrado' });
    res.json({ message: 'Stock eliminado' });
  } catch (err) { next(err); }
};

// ─── Stock proveedor ──────────────────────────────────────────────────────────

const getProveedorAll = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT sp.*, i.nombre AS nombre_insumo, i.unidad_medida,
             CASE WHEN sp.cantidad <= sp.cantidad_minima THEN TRUE ELSE FALSE END AS stock_bajo
      FROM stock_proveedor sp
      JOIN insumo i ON i.id_insumo = sp.id_insumo
      ORDER BY i.nombre
    `);
    res.json(rows);
  } catch (err) { next(err); }
};

const getProveedorById = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT sp.*, i.nombre AS nombre_insumo, i.unidad_medida
      FROM stock_proveedor sp
      JOIN insumo i ON i.id_insumo = sp.id_insumo
      WHERE sp.id_stock_proveedor = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Stock proveedor no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

const createProveedor = async (req, res, next) => {
  try {
    const { id_insumo, cantidad, cantidad_minima } = req.body;
    const [result] = await db.query(
      'INSERT INTO stock_proveedor (id_insumo, cantidad, cantidad_minima) VALUES (?, ?, ?)',
      [id_insumo, cantidad ?? 0, cantidad_minima ?? 0]
    );
    res.status(201).json({ id_stock_proveedor: result.insertId });
  } catch (err) { next(err); }
};

const ajustarProveedor = async (req, res, next) => {
  try {
    const { delta } = req.body;
    if (delta === undefined) return res.status(400).json({ error: 'Falta campo delta' });

    const [result] = await db.query(
      'UPDATE stock_proveedor SET cantidad = cantidad + ? WHERE id_stock_proveedor = ?',
      [delta, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Stock proveedor no encontrado' });

    const [rows] = await db.query('SELECT cantidad FROM stock_proveedor WHERE id_stock_proveedor = ?', [req.params.id]);
    res.json({ cantidad_nueva: rows[0].cantidad });
  } catch (err) { next(err); }
};

const getProveedorBajoMinimo = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT sp.*, i.nombre AS nombre_insumo, i.unidad_medida
      FROM stock_proveedor sp
      JOIN insumo i ON i.id_insumo = sp.id_insumo
      WHERE sp.cantidad <= sp.cantidad_minima
      ORDER BY i.nombre
    `);
    res.json(rows);
  } catch (err) { next(err); }
};

// ─── Transferencias proveedor → sucursal ─────────────────────────────────────

const transferir = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const { id_stock_proveedor, id_stock, cantidad, notas } = req.body;
    if (!id_stock_proveedor || !id_stock || !cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'Campos requeridos: id_stock_proveedor, id_stock, cantidad (> 0)' });
    }

    await conn.beginTransaction();

    const [[proveedor]] = await conn.query(
      'SELECT cantidad FROM stock_proveedor WHERE id_stock_proveedor = ? FOR UPDATE',
      [id_stock_proveedor]
    );
    if (!proveedor) { await conn.rollback(); return res.status(404).json({ error: 'Stock proveedor no encontrado' }); }
    if (proveedor.cantidad < cantidad) {
      await conn.rollback();
      return res.status(400).json({ error: 'Stock insuficiente en proveedor', disponible: proveedor.cantidad });
    }

    const [[stockSucursal]] = await conn.query(
      'SELECT id_stock FROM stock_insumo WHERE id_stock = ? FOR UPDATE',
      [id_stock]
    );
    if (!stockSucursal) { await conn.rollback(); return res.status(404).json({ error: 'Stock sucursal no encontrado' }); }

    // Verificar que el insumo coincide
    const [[check]] = await conn.query(
      `SELECT sp.id_insumo AS insumo_proveedor, si.id_insumo AS insumo_sucursal
       FROM stock_proveedor sp, stock_insumo si
       WHERE sp.id_stock_proveedor = ? AND si.id_stock = ?`,
      [id_stock_proveedor, id_stock]
    );
    if (check.insumo_proveedor !== check.insumo_sucursal) {
      await conn.rollback();
      return res.status(400).json({ error: 'El insumo del proveedor no coincide con el insumo del stock sucursal' });
    }

    await conn.query(
      'UPDATE stock_proveedor SET cantidad = cantidad - ? WHERE id_stock_proveedor = ?',
      [cantidad, id_stock_proveedor]
    );
    await conn.query(
      'UPDATE stock_insumo SET cantidad = cantidad + ? WHERE id_stock = ?',
      [cantidad, id_stock]
    );
    const [ins] = await conn.query(
      'INSERT INTO transferencia_stock (id_stock_proveedor, id_stock, cantidad, id_usuario, notas) VALUES (?, ?, ?, ?, ?)',
      [id_stock_proveedor, id_stock, cantidad, req.user.id_usuario, notas ?? null]
    );

    await conn.commit();
    res.status(201).json({ id_transferencia: ins.insertId, mensaje: 'Transferencia realizada' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

const getTransferencias = async (req, res, next) => {
  try {
    const { id_sucursal, id_insumo, desde, hasta } = req.query;
    const conditions = [];
    const params = [];

    if (id_sucursal) { conditions.push('si.id_sucursal = ?'); params.push(id_sucursal); }
    if (id_insumo)   { conditions.push('sp.id_insumo = ?');   params.push(id_insumo); }
    if (desde)       { conditions.push('t.fecha >= ?');        params.push(desde); }
    if (hasta)       { conditions.push('t.fecha <= ?');        params.push(hasta); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.query(`
      SELECT t.*, i.nombre AS nombre_insumo, i.unidad_medida,
             s.nombre AS nombre_sucursal,
             CONCAT(p.nombres, ' ', p.apellidos) AS realizado_por
      FROM transferencia_stock t
      JOIN stock_proveedor sp ON sp.id_stock_proveedor = t.id_stock_proveedor
      JOIN stock_insumo    si ON si.id_stock           = t.id_stock
      JOIN insumo          i  ON i.id_insumo           = sp.id_insumo
      JOIN sucursal        s  ON s.id_sucursal         = si.id_sucursal
      JOIN usuario         u  ON u.id_usuario          = t.id_usuario
      JOIN persona         p  ON p.id_persona          = u.id_persona
      ${where}
      ORDER BY t.fecha DESC
    `, params);
    res.json(rows);
  } catch (err) { next(err); }
};

module.exports = {
  getAll, getStockBajo, getById, create, ajustarCantidad, update, remove,
  getProveedorAll, getProveedorById, createProveedor, ajustarProveedor, getProveedorBajoMinimo,
  transferir, getTransferencias,
};
