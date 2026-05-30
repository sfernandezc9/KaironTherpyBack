const db = require('../config/db');

const getAll = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM insumo ORDER BY nombre');
    res.json(rows);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM insumo WHERE id_insumo = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Insumo no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

const getStockPorSucursal = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT si.*, s.nombre AS nombre_sucursal,
             CASE WHEN si.cantidad <= si.cantidad_minima THEN TRUE ELSE FALSE END AS stock_bajo
      FROM stock_insumo si
      JOIN sucursal s ON s.id_sucursal = si.id_sucursal
      WHERE si.id_insumo = ?
      ORDER BY s.nombre
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { nombre, descripcion, unidad_medida } = req.body;
    const [result] = await db.query(
      'INSERT INTO insumo (nombre, descripcion, unidad_medida) VALUES (?, ?, ?)',
      [nombre, descripcion, unidad_medida]
    );
    res.status(201).json({ id_insumo: result.insertId });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { nombre, descripcion, unidad_medida } = req.body;
    const [result] = await db.query(
      'UPDATE insumo SET nombre=?, descripcion=?, unidad_medida=? WHERE id_insumo=?',
      [nombre, descripcion, unidad_medida, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Insumo no encontrado' });
    res.json({ message: 'Insumo actualizado' });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const [result] = await db.query('DELETE FROM insumo WHERE id_insumo = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Insumo no encontrado' });
    res.json({ message: 'Insumo eliminado' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, getStockPorSucursal, create, update, remove };
