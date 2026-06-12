const db = require('../config/db');

const getAll = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, e.nombre AS nombre_empresa
      FROM sucursal s
      JOIN empresa e ON e.id_empresa = s.id_empresa
      ORDER BY s.nombre
    `);
    res.json(rows);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, e.nombre AS nombre_empresa
      FROM sucursal s
      JOIN empresa e ON e.id_empresa = s.id_empresa
      WHERE s.id_sucursal = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Sucursal no encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

const getTerapeutas = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, p.nombres, p.apellidos, p.rut, p.email, p.telefono,
             ts.fecha_inicio, ts.fecha_fin
      FROM terapeuta_sucursal ts
      JOIN terapeuta t ON t.id_terapeuta = ts.id_terapeuta
      JOIN persona p   ON p.id_persona   = t.id_persona
      WHERE ts.id_sucursal = ? AND ts.fecha_fin IS NULL
      ORDER BY p.apellidos
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
};

const getStock = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT si.*, i.nombre AS nombre_insumo, i.unidad_medida,
             CASE WHEN si.cantidad <= si.cantidad_minima THEN TRUE ELSE FALSE END AS stock_bajo
      FROM stock_insumo si
      JOIN insumo i ON i.id_insumo = si.id_insumo
      WHERE si.id_sucursal = ?
      ORDER BY i.nombre
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { id_empresa, nombre, direccion, activa } = req.body;
    const [result] = await db.query(
      'INSERT INTO sucursal (id_empresa, nombre, direccion, activa) VALUES (?, ?, ?, ?)',
      [id_empresa, nombre, direccion, activa ?? true]
    );
    res.status(201).json({ id_sucursal: result.insertId });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { id_empresa, nombre, direccion, activa } = req.body;
    const [result] = await db.query(
      'UPDATE sucursal SET id_empresa=?, nombre=?, direccion=?, activa=? WHERE id_sucursal=?',
      [id_empresa, nombre, direccion, activa, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Sucursal no encontrada' });
    res.json({ message: 'Sucursal actualizada' });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const [result] = await db.query('DELETE FROM sucursal WHERE id_sucursal = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Sucursal no encontrada' });
    res.json({ message: 'Sucursal eliminada' });
  } catch (err) { next(err); }
};

// ── Responsables ──────────────────────────────────────────────

const getResponsables = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM responsable_sucursal WHERE id_sucursal = ? ORDER BY nombre',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

const createResponsable = async (req, res, next) => {
  try {
    const { nombre, cargo, email, celular } = req.body;
    const [result] = await db.query(
      'INSERT INTO responsable_sucursal (id_sucursal, nombre, cargo, email, celular) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, nombre, cargo, email, celular]
    );
    res.status(201).json({ id_responsable: result.insertId });
  } catch (err) { next(err); }
};

const updateResponsable = async (req, res, next) => {
  try {
    const { nombre, cargo, email, celular } = req.body;
    const [result] = await db.query(
      'UPDATE responsable_sucursal SET nombre=?, cargo=?, email=?, celular=? WHERE id_responsable=? AND id_sucursal=?',
      [nombre, cargo, email, celular, req.params.id_resp, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Responsable no encontrado' });
    res.json({ message: 'Responsable actualizado' });
  } catch (err) { next(err); }
};

const removeResponsable = async (req, res, next) => {
  try {
    const [result] = await db.query(
      'DELETE FROM responsable_sucursal WHERE id_responsable=? AND id_sucursal=?',
      [req.params.id_resp, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Responsable no encontrado' });
    res.json({ message: 'Responsable eliminado' });
  } catch (err) { next(err); }
};

module.exports = {
  getAll, getById, getTerapeutas, getStock,
  create, update, remove,
  getResponsables, createResponsable, updateResponsable, removeResponsable,
};
