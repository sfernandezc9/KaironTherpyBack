const db = require('../config/db');

const getAll = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM empresa ORDER BY nombre');
    res.json(rows);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM empresa WHERE id_empresa = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

const getSucursales = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM sucursal WHERE id_empresa = ? ORDER BY nombre',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { nombre, rut, direccion, telefono, email } = req.body;
    const [result] = await db.query(
      'INSERT INTO empresa (nombre, rut, direccion, telefono, email) VALUES (?, ?, ?, ?, ?)',
      [nombre, rut, direccion, telefono, email]
    );
    res.status(201).json({ id_empresa: result.insertId });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { nombre, rut, direccion, telefono, email } = req.body;
    const [result] = await db.query(
      'UPDATE empresa SET nombre=?, rut=?, direccion=?, telefono=?, email=? WHERE id_empresa=?',
      [nombre, rut, direccion, telefono, email, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json({ message: 'Empresa actualizada' });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const [result] = await db.query('DELETE FROM empresa WHERE id_empresa = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json({ message: 'Empresa eliminada' });
  } catch (err) { next(err); }
};

// ── Responsables de empresa ───────────────────────────────────

const getResponsables = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM responsable_empresa WHERE id_empresa = ? ORDER BY nombre',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

const createResponsable = async (req, res, next) => {
  try {
    const { nombre, cargo, email, celular } = req.body;
    const [result] = await db.query(
      'INSERT INTO responsable_empresa (id_empresa, nombre, cargo, email, celular) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, nombre, cargo, email, celular]
    );
    res.status(201).json({ id_responsable: result.insertId });
  } catch (err) { next(err); }
};

const updateResponsable = async (req, res, next) => {
  try {
    const { nombre, cargo, email, celular } = req.body;
    const [result] = await db.query(
      'UPDATE responsable_empresa SET nombre=?, cargo=?, email=?, celular=? WHERE id_responsable=? AND id_empresa=?',
      [nombre, cargo, email, celular, req.params.id_resp, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Responsable no encontrado' });
    res.json({ message: 'Responsable actualizado' });
  } catch (err) { next(err); }
};

const removeResponsable = async (req, res, next) => {
  try {
    const [result] = await db.query(
      'DELETE FROM responsable_empresa WHERE id_responsable=? AND id_empresa=?',
      [req.params.id_resp, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Responsable no encontrado' });
    res.json({ message: 'Responsable eliminado' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, getSucursales, create, update, remove, getResponsables, createResponsable, updateResponsable, removeResponsable };
