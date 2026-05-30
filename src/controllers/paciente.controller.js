const db = require('../config/db');

const getAll = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT pac.*, p.rut, p.nombres, p.apellidos, p.fecha_nacimiento, p.genero,
             p.telefono, p.email, p.direccion, s.nombre AS nombre_sucursal
      FROM paciente pac
      JOIN persona  p ON p.id_persona   = pac.id_persona
      JOIN sucursal s ON s.id_sucursal  = pac.id_sucursal
      ORDER BY p.apellidos, p.nombres
    `);
    res.json(rows);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT pac.*, p.rut, p.nombres, p.apellidos, p.fecha_nacimiento, p.genero,
             p.telefono, p.email, p.direccion, s.nombre AS nombre_sucursal
      FROM paciente pac
      JOIN persona  p ON p.id_persona  = pac.id_persona
      JOIN sucursal s ON s.id_sucursal = pac.id_sucursal
      WHERE pac.id_paciente = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

const getFicha = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM ficha_clinica WHERE id_paciente = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Ficha no encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

const getSesiones = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT ses.*, p.nombres, p.apellidos, s.nombre AS nombre_sucursal
      FROM sesion ses
      JOIN ficha_clinica fc ON fc.id_ficha    = ses.id_ficha
      JOIN terapeuta t      ON t.id_terapeuta = ses.id_terapeuta
      JOIN persona p        ON p.id_persona   = t.id_persona
      JOIN sucursal s       ON s.id_sucursal  = ses.id_sucursal
      WHERE fc.id_paciente = ?
      ORDER BY ses.fecha DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
};

// Crea persona + paciente en una transacción
const create = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      rut, nombres, apellidos, fecha_nacimiento, genero, telefono, email, direccion,
      id_sucursal, prevision, contacto_emergencia_nombre, contacto_emergencia_telefono
    } = req.body;

    const [personaResult] = await conn.query(
      `INSERT INTO persona (rut, nombres, apellidos, fecha_nacimiento, genero, telefono, email, direccion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [rut, nombres, apellidos, fecha_nacimiento, genero, telefono, email, direccion]
    );
    const id_persona = personaResult.insertId;

    const [pacienteResult] = await conn.query(
      `INSERT INTO paciente (id_persona, id_sucursal, prevision, contacto_emergencia_nombre, contacto_emergencia_telefono)
       VALUES (?, ?, ?, ?, ?)`,
      [id_persona, id_sucursal, prevision, contacto_emergencia_nombre, contacto_emergencia_telefono]
    );

    await conn.commit();
    res.status(201).json({ id_persona, id_paciente: pacienteResult.insertId });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

const update = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      rut, nombres, apellidos, fecha_nacimiento, genero, telefono, email, direccion,
      id_sucursal, prevision, contacto_emergencia_nombre, contacto_emergencia_telefono, activo
    } = req.body;

    const [pac] = await conn.query('SELECT id_persona FROM paciente WHERE id_paciente = ?', [req.params.id]);
    if (!pac.length) { await conn.rollback(); return res.status(404).json({ error: 'Paciente no encontrado' }); }

    await conn.query(
      `UPDATE persona SET rut=?, nombres=?, apellidos=?, fecha_nacimiento=?, genero=?,
       telefono=?, email=?, direccion=? WHERE id_persona=?`,
      [rut, nombres, apellidos, fecha_nacimiento, genero, telefono, email, direccion, pac[0].id_persona]
    );

    await conn.query(
      `UPDATE paciente SET id_sucursal=?, prevision=?, contacto_emergencia_nombre=?,
       contacto_emergencia_telefono=?, activo=? WHERE id_paciente=?`,
      [id_sucursal, prevision, contacto_emergencia_nombre, contacto_emergencia_telefono, activo, req.params.id]
    );

    await conn.commit();
    res.json({ message: 'Paciente actualizado' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

const remove = async (req, res, next) => {
  try {
    const [result] = await db.query('DELETE FROM paciente WHERE id_paciente = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json({ message: 'Paciente eliminado' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, getFicha, getSesiones, create, update, remove };
