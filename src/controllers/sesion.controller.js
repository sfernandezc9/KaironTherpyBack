const db = require('../config/db');

const getAll = async (req, res, next) => {
  try {
    const { id_sucursal, id_terapeuta, desde, hasta, estado } = req.query;
    let sql = `
      SELECT ses.*, fc.id_paciente,
             p_pac.nombres AS nombre_paciente, p_pac.apellidos AS apellido_paciente,
             p_ter.nombres AS nombre_terapeuta, p_ter.apellidos AS apellido_terapeuta,
             s.nombre AS nombre_sucursal
      FROM sesion ses
      JOIN ficha_clinica fc ON fc.id_ficha     = ses.id_ficha
      JOIN paciente pac     ON pac.id_paciente  = fc.id_paciente
      JOIN persona p_pac    ON p_pac.id_persona = pac.id_persona
      JOIN terapeuta t      ON t.id_terapeuta   = ses.id_terapeuta
      JOIN persona p_ter    ON p_ter.id_persona = t.id_persona
      JOIN sucursal s       ON s.id_sucursal    = ses.id_sucursal
      WHERE 1=1
    `;
    const params = [];
    if (id_sucursal)  { sql += ' AND ses.id_sucursal = ?';  params.push(id_sucursal); }
    if (id_terapeuta) { sql += ' AND ses.id_terapeuta = ?'; params.push(id_terapeuta); }
    if (desde)        { sql += ' AND ses.fecha >= ?';       params.push(desde); }
    if (hasta)        { sql += ' AND ses.fecha <= ?';       params.push(hasta); }
    if (estado)       { sql += ' AND ses.estado = ?';       params.push(estado); }
    sql += ' ORDER BY ses.fecha DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT ses.*, fc.id_paciente,
             p_pac.nombres AS nombre_paciente, p_pac.apellidos AS apellido_paciente,
             p_ter.nombres AS nombre_terapeuta, p_ter.apellidos AS apellido_terapeuta,
             s.nombre AS nombre_sucursal
      FROM sesion ses
      JOIN ficha_clinica fc ON fc.id_ficha     = ses.id_ficha
      JOIN paciente pac     ON pac.id_paciente  = fc.id_paciente
      JOIN persona p_pac    ON p_pac.id_persona = pac.id_persona
      JOIN terapeuta t      ON t.id_terapeuta   = ses.id_terapeuta
      JOIN persona p_ter    ON p_ter.id_persona = t.id_persona
      JOIN sucursal s       ON s.id_sucursal    = ses.id_sucursal
      WHERE ses.id_sesion = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Sesión no encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

const getInsumos = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT si_uso.*, i.nombre AS nombre_insumo, i.unidad_medida
      FROM sesion_insumo si_uso
      JOIN stock_insumo si ON si.id_stock  = si_uso.id_stock
      JOIN insumo       i  ON i.id_insumo  = si.id_insumo
      WHERE si_uso.id_sesion = ?
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { id_ficha, id_terapeuta, id_sucursal, fecha, duracion_minutos, estado, notas_sesion } = req.body;
    const [result] = await db.query(
      `INSERT INTO sesion (id_ficha, id_terapeuta, id_sucursal, fecha, duracion_minutos, estado, notas_sesion)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_ficha, id_terapeuta, id_sucursal, fecha || new Date(), duracion_minutos, estado || 'realizada', notas_sesion]
    );
    res.status(201).json({ id_sesion: result.insertId });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { id_terapeuta, id_sucursal, fecha, duracion_minutos, estado, notas_sesion } = req.body;
    const [result] = await db.query(
      `UPDATE sesion SET id_terapeuta=?, id_sucursal=?, fecha=?, duracion_minutos=?,
       estado=?, notas_sesion=? WHERE id_sesion=?`,
      [id_terapeuta, id_sucursal, fecha, duracion_minutos, estado, notas_sesion, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Sesión no encontrada' });
    res.json({ message: 'Sesión actualizada' });
  } catch (err) { next(err); }
};

// Agrega insumo a sesión y descuenta del stock en transacción
const addInsumo = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { id_stock, cantidad_usada } = req.body;
    if (!id_stock || !cantidad_usada) {
      await conn.rollback();
      return res.status(400).json({ error: 'id_stock y cantidad_usada son requeridos' });
    }

    const [stocks] = await conn.query('SELECT * FROM stock_insumo WHERE id_stock = ?', [id_stock]);
    if (!stocks.length) { await conn.rollback(); return res.status(404).json({ error: 'Stock no encontrado' }); }

    if (stocks[0].cantidad < cantidad_usada) {
      await conn.rollback();
      return res.status(400).json({ error: 'Stock insuficiente', disponible: stocks[0].cantidad });
    }

    await conn.query(
      'UPDATE stock_insumo SET cantidad = cantidad - ? WHERE id_stock = ?',
      [cantidad_usada, id_stock]
    );

    const [result] = await conn.query(
      'INSERT INTO sesion_insumo (id_sesion, id_stock, cantidad_usada) VALUES (?, ?, ?)',
      [req.params.id, id_stock, cantidad_usada]
    );

    await conn.commit();
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

const removeInsumo = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [uso] = await conn.query('SELECT * FROM sesion_insumo WHERE id = ?', [req.params.id_uso]);
    if (!uso.length) { await conn.rollback(); return res.status(404).json({ error: 'Registro no encontrado' }); }

    // Devuelve al stock
    await conn.query(
      'UPDATE stock_insumo SET cantidad = cantidad + ? WHERE id_stock = ?',
      [uso[0].cantidad_usada, uso[0].id_stock]
    );

    await conn.query('DELETE FROM sesion_insumo WHERE id = ?', [req.params.id_uso]);

    await conn.commit();
    res.json({ message: 'Insumo removido y stock restaurado' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

const remove = async (req, res, next) => {
  try {
    const [result] = await db.query('DELETE FROM sesion WHERE id_sesion = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Sesión no encontrada' });
    res.json({ message: 'Sesión eliminada' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, getInsumos, create, update, addInsumo, removeInsumo, remove };
