const db = require('../config/db');

const getAll = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, p.rut, p.nombres, p.apellidos, p.fecha_nacimiento, p.genero,
             p.telefono, p.email, p.direccion, p.nacionalidad,
             u.ultimo_login
      FROM terapeuta t
      JOIN persona p ON p.id_persona = t.id_persona
      LEFT JOIN usuario u ON u.id_persona = t.id_persona
      ORDER BY p.apellidos, p.nombres
    `);
    res.json(rows);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, p.rut, p.nombres, p.apellidos, p.fecha_nacimiento, p.genero,
             p.telefono, p.email, p.direccion, p.nacionalidad,
             u.ultimo_login
      FROM terapeuta t
      JOIN persona p ON p.id_persona = t.id_persona
      LEFT JOIN usuario u ON u.id_persona = t.id_persona
      WHERE t.id_terapeuta = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Terapeuta no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

const getSucursales = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, e.nombre AS nombre_empresa, ts.fecha_inicio, ts.fecha_fin
      FROM terapeuta_sucursal ts
      JOIN sucursal s ON s.id_sucursal = ts.id_sucursal
      JOIN empresa e ON e.id_empresa = s.id_empresa
      WHERE ts.id_terapeuta = ?
      ORDER BY ts.fecha_inicio DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
};

const asignarSucursal = async (req, res, next) => {
  try {
    const { id_sucursal, fecha_inicio } = req.body;
    const [active] = await db.query(
      `SELECT id FROM terapeuta_sucursal WHERE id_terapeuta = ? AND id_sucursal = ? AND fecha_fin IS NULL`,
      [req.params.id, id_sucursal]
    );
    if (active.length) return res.status(409).json({ error: 'El terapeuta ya tiene una asignación activa en esta sucursal' });
    const [result] = await db.query(
      `INSERT INTO terapeuta_sucursal (id_terapeuta, id_sucursal, fecha_inicio)
       VALUES (?, ?, ?)`,
      [req.params.id, id_sucursal, fecha_inicio || new Date().toISOString().slice(0, 10)]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { next(err); }
};

const desasignarSucursal = async (req, res, next) => {
  try {
    const { fecha_fin } = req.body;
    await db.query(
      `UPDATE terapeuta_sucursal SET fecha_fin = ?
       WHERE id_terapeuta = ? AND id_sucursal = ? AND fecha_fin IS NULL`,
      [fecha_fin || new Date().toISOString().slice(0, 10), req.params.id, req.params.id_sucursal]
    );
    res.json({ message: 'Desasignado de sucursal' });
  } catch (err) { next(err); }
};

const getSesiones = async (req, res, next) => {
  try {
    const { desde, hasta } = req.query;
    let sql = `
      SELECT ses.*, fc.id_paciente, p2.nombres AS nombre_paciente, p2.apellidos AS apellido_paciente,
             s.nombre AS nombre_sucursal
      FROM sesion ses
      JOIN ficha_clinica fc ON fc.id_ficha   = ses.id_ficha
      JOIN paciente pac     ON pac.id_paciente = fc.id_paciente
      JOIN persona p2       ON p2.id_persona   = pac.id_persona
      JOIN sucursal s       ON s.id_sucursal   = ses.id_sucursal
      WHERE ses.id_terapeuta = ?
    `;
    const params = [req.params.id];
    if (desde) { sql += ' AND ses.fecha >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND ses.fecha <= ?'; params.push(hasta); }
    sql += ' ORDER BY ses.fecha DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
};

// Crea persona + terapeuta en transacción
const create = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      rut, nombres, apellidos, fecha_nacimiento, genero, telefono, email, direccion, nacionalidad,
      especialidad_1, especialidad_2, especialidad_3, registro_profesional
    } = req.body;

    if (!especialidad_1) { await conn.rollback(); return res.status(400).json({ error: 'especialidad_1 es obligatoria' }); }

    const [personaResult] = await conn.query(
      `INSERT INTO persona (rut, nombres, apellidos, fecha_nacimiento, genero, telefono, email, direccion, nacionalidad)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [rut, nombres, apellidos, fecha_nacimiento, genero, telefono, email, direccion, nacionalidad || null]
    );
    const id_persona = personaResult.insertId;

    const [terapeutaResult] = await conn.query(
      'INSERT INTO terapeuta (id_persona, especialidad_1, especialidad_2, especialidad_3, registro_profesional) VALUES (?, ?, ?, ?, ?)',
      [id_persona, especialidad_1, especialidad_2 || null, especialidad_3 || null, registro_profesional]
    );

    await conn.commit();
    res.status(201).json({ id_persona, id_terapeuta: terapeutaResult.insertId });
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
      rut, nombres, apellidos, fecha_nacimiento, genero, telefono, email, direccion, nacionalidad,
      especialidad_1, especialidad_2, especialidad_3, registro_profesional, activo
    } = req.body;

    const [ter] = await conn.query('SELECT id_persona FROM terapeuta WHERE id_terapeuta = ?', [req.params.id]);
    if (!ter.length) { await conn.rollback(); return res.status(404).json({ error: 'Terapeuta no encontrado' }); }

    if (especialidad_1 !== undefined && !especialidad_1) { await conn.rollback(); return res.status(400).json({ error: 'especialidad_1 no puede estar vacía' }); }

    await conn.query(
      `UPDATE persona SET rut=?, nombres=?, apellidos=?, fecha_nacimiento=?, genero=?,
       telefono=?, email=?, direccion=?, nacionalidad=? WHERE id_persona=?`,
      [rut, nombres, apellidos, fecha_nacimiento, genero, telefono, email, direccion, nacionalidad || null, ter[0].id_persona]
    );

    await conn.query(
      'UPDATE terapeuta SET especialidad_1=?, especialidad_2=?, especialidad_3=?, registro_profesional=?, activo=? WHERE id_terapeuta=?',
      [especialidad_1, especialidad_2 || null, especialidad_3 || null, registro_profesional, activo, req.params.id]
    );

    await conn.commit();
    res.json({ message: 'Terapeuta actualizado' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

const remove = async (req, res, next) => {
  try {
    const [result] = await db.query('DELETE FROM terapeuta WHERE id_terapeuta = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Terapeuta no encontrado' });
    res.json({ message: 'Terapeuta eliminado' });
  } catch (err) { next(err); }
};

// Informe agregado de un terapeuta: trabajadores tratados / activos / con alta
// y casos de consumo por sustancia.
const getInforme = async (req, res, next) => {
  try {
    const id = req.params.id;

    const [tRows] = await db.query(`
      SELECT t.id_terapeuta, t.especialidad_1, t.especialidad_2, t.especialidad_3,
             t.registro_profesional, t.activo,
             p.rut, p.nombres, p.apellidos, p.email, p.telefono
      FROM terapeuta t
      JOIN persona p ON p.id_persona = t.id_persona
      WHERE t.id_terapeuta = ?
    `, [id]);
    if (!tRows.length) return res.status(404).json({ error: 'Terapeuta no encontrado' });

    // Pacientes tratados (con al menos una sesión del terapeuta) + flag de alta
    const [counts] = await db.query(`
      SELECT
        COUNT(*)                              AS tratados,
        COALESCE(SUM(alta), 0)                AS con_alta,
        COALESCE(SUM(1 - alta), 0)            AS activos
      FROM (
        SELECT fc.id_paciente,
          EXISTS (
            SELECT 1 FROM sesion sx
            JOIN ficha_clinica fx ON fx.id_ficha = sx.id_ficha
            WHERE fx.id_paciente = fc.id_paciente AND sx.estado = 'de_alta'
          ) AS alta
        FROM sesion ses
        JOIN ficha_clinica fc ON fc.id_ficha = ses.id_ficha
        WHERE ses.id_terapeuta = ?
        GROUP BY fc.id_paciente
      ) t
    `, [id]);

    // Casos de consumo por sustancia entre los pacientes tratados
    const [consumoRows] = await db.query(`
      SELECT fco.sustancia, COUNT(DISTINCT fc.id_paciente) AS casos
      FROM ficha_consumo fco
      JOIN ficha_clinica fc ON fc.id_ficha = fco.id_ficha
      WHERE fc.id_paciente IN (
        SELECT DISTINCT fc2.id_paciente
        FROM sesion s2
        JOIN ficha_clinica fc2 ON fc2.id_ficha = s2.id_ficha
        WHERE s2.id_terapeuta = ?
      )
      AND (
        (fco.consumo_actual IS NOT NULL AND fco.consumo_actual <> '')
        OR (fco.edad_inicio IS NOT NULL AND fco.edad_inicio <> '')
      )
      GROUP BY fco.sustancia
    `, [id]);

    const consumo = { oh: 0, thc: 0, cc: 0, pbc: 0, bzo: 0, amp: 0, otros: 0 };
    for (const r of consumoRows) {
      const key = String(r.sustancia).toLowerCase();
      if (key in consumo) consumo[key] = Number(r.casos);
    }

    res.json({
      terapeuta: tRows[0],
      trabajadores_tratados: Number(counts[0].tratados),
      trabajadores_activos: Number(counts[0].activos),
      trabajadores_alta: Number(counts[0].con_alta),
      consumo,
    });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, getSucursales, asignarSucursal, desasignarSucursal, getSesiones, create, update, remove, getInforme };
