const db = require('../config/db');

const getAll = async (req, res, next) => {
  try {
    const { tipo } = req.query;
    let sql = 'SELECT * FROM informe WHERE 1=1';
    const params = [];
    if (tipo) { sql += ' AND tipo = ?'; params.push(tipo); }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM informe WHERE id_informe = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Informe no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const {
      titulo, tipo,
      id_empresa, id_sucursal, id_paciente, id_terapeuta, id_insumo,
      fecha_desde, fecha_hasta, contenido, url_documento, generado_por
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO informe
         (titulo, tipo, id_empresa, id_sucursal, id_paciente, id_terapeuta, id_insumo,
          fecha_desde, fecha_hasta, contenido, url_documento, generado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [titulo, tipo, id_empresa, id_sucursal, id_paciente, id_terapeuta, id_insumo,
       fecha_desde, fecha_hasta, contenido, url_documento, generado_por]
    );
    res.status(201).json({ id_informe: result.insertId });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const {
      titulo, tipo,
      id_empresa, id_sucursal, id_paciente, id_terapeuta, id_insumo,
      fecha_desde, fecha_hasta, contenido, url_documento, generado_por
    } = req.body;

    const [result] = await db.query(
      `UPDATE informe SET
         titulo=?, tipo=?, id_empresa=?, id_sucursal=?, id_paciente=?, id_terapeuta=?, id_insumo=?,
         fecha_desde=?, fecha_hasta=?, contenido=?, url_documento=?, generado_por=?
       WHERE id_informe=?`,
      [titulo, tipo, id_empresa, id_sucursal, id_paciente, id_terapeuta, id_insumo,
       fecha_desde, fecha_hasta, contenido, url_documento, generado_por, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Informe no encontrado' });
    res.json({ message: 'Informe actualizado' });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const [result] = await db.query('DELETE FROM informe WHERE id_informe = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Informe no encontrado' });
    res.json({ message: 'Informe eliminado' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };
