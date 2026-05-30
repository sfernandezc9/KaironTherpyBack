const db = require('../config/db');

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
    const { id_sucursal, id_insumo, cantidad, cantidad_minima } = req.body;
    const [result] = await db.query(
      'INSERT INTO stock_insumo (id_sucursal, id_insumo, cantidad, cantidad_minima) VALUES (?, ?, ?, ?)',
      [id_sucursal, id_insumo, cantidad ?? 0, cantidad_minima ?? 0]
    );
    res.status(201).json({ id_stock: result.insertId });
  } catch (err) { next(err); }
};

// Ajuste de cantidad (entrada/salida manual)
const ajustarCantidad = async (req, res, next) => {
  try {
    const { delta } = req.body;  // positivo = entrada, negativo = salida
    if (delta === undefined) return res.status(400).json({ error: 'Falta campo delta' });

    const [result] = await db.query(
      'UPDATE stock_insumo SET cantidad = cantidad + ? WHERE id_stock = ?',
      [delta, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Stock no encontrado' });

    const [rows] = await db.query('SELECT cantidad FROM stock_insumo WHERE id_stock = ?', [req.params.id]);
    res.json({ cantidad_nueva: rows[0].cantidad });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { cantidad, cantidad_minima } = req.body;
    const [result] = await db.query(
      'UPDATE stock_insumo SET cantidad=?, cantidad_minima=? WHERE id_stock=?',
      [cantidad, cantidad_minima, req.params.id]
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

module.exports = { getAll, getStockBajo, getById, create, ajustarCantidad, update, remove };
