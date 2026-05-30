const db = require('../config/db');

const getAll = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM persona ORDER BY apellidos, nombres');
    res.json(rows);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM persona WHERE id_persona = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Persona no encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { rut, nombres, apellidos, fecha_nacimiento, genero, telefono, email, direccion } = req.body;
    const [result] = await db.query(
      `INSERT INTO persona (rut, nombres, apellidos, fecha_nacimiento, genero, telefono, email, direccion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [rut, nombres, apellidos, fecha_nacimiento, genero, telefono, email, direccion]
    );
    res.status(201).json({ id_persona: result.insertId });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { rut, nombres, apellidos, fecha_nacimiento, genero, telefono, email, direccion } = req.body;
    const [result] = await db.query(
      `UPDATE persona SET rut=?, nombres=?, apellidos=?, fecha_nacimiento=?, genero=?,
       telefono=?, email=?, direccion=? WHERE id_persona=?`,
      [rut, nombres, apellidos, fecha_nacimiento, genero, telefono, email, direccion, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Persona no encontrada' });
    res.json({ message: 'Persona actualizada' });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const [result] = await db.query('DELETE FROM persona WHERE id_persona = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Persona no encontrada' });
    res.json({ message: 'Persona eliminada' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };
