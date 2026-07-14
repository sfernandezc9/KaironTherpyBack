const db = require('../config/db');
const { terapeutaEnSucursal, sucursalDeFicha, sucursalDePaciente } = require('../utils/access');

const CAMPOS_AUDITABLES = [
  'motivo_consulta', 'antecedentes', 'alergias',
  'medicamentos', 'diagnostico_actual', 'observaciones',
  'enfermedades_mentales', 'enfermedades_biologicas',
  'edad_inicio_consumo', 'consumo_observaciones',
  'historial_familiar', 'indicacion_intervencion', 'modalidad'
];

const getAll = async (req, res, next) => {
  try {
    let sql = `
      SELECT fc.*, p.nombres, p.apellidos, p.rut
      FROM ficha_clinica fc
      JOIN paciente pac ON pac.id_paciente = fc.id_paciente
      JOIN persona  p   ON p.id_persona    = pac.id_persona
    `;
    const params = [];
    if (req.user.rol === 'terapeuta') {
      sql += ` WHERE pac.id_sucursal IN (
        SELECT id_sucursal FROM terapeuta_sucursal
        WHERE id_terapeuta = ? AND (fecha_fin IS NULL OR fecha_fin >= CURDATE())
      )`;
      params.push(req.user.id_terapeuta);
    }
    sql += ' ORDER BY p.apellidos, p.nombres';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT fc.*, p.nombres, p.apellidos, p.rut, p.fecha_nacimiento, p.genero,
             p.telefono, p.email, pac.prevision
      FROM ficha_clinica fc
      JOIN paciente pac ON pac.id_paciente = fc.id_paciente
      JOIN persona  p   ON p.id_persona    = pac.id_persona
      WHERE fc.id_ficha = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Ficha no encontrada' });
    if (req.user.rol === 'terapeuta' &&
        !(await terapeutaEnSucursal(req.user.id_terapeuta, await sucursalDeFicha(req.params.id)))) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const ficha = rows[0];
    const [consumos] = await db.query('SELECT * FROM ficha_consumo WHERE id_ficha = ?', [ficha.id_ficha]);
    const [tratamientos] = await db.query('SELECT * FROM tratamiento_anterior WHERE id_ficha = ?', [ficha.id_ficha]);
    ficha.consumos = consumos;
    ficha.tratamientos = tratamientos;
    res.json(ficha);
  } catch (err) { next(err); }
};

const getHistorial = async (req, res, next) => {
  try {
    if (req.user.rol === 'terapeuta') {
      const suc = await sucursalDeFicha(req.params.id);
      if (suc === null) return res.status(404).json({ error: 'Ficha no encontrada' });
      if (!(await terapeutaEnSucursal(req.user.id_terapeuta, suc))) {
        return res.status(403).json({ error: 'Acceso denegado' });
      }
    }
    const [rows] = await db.query(`
      SELECT ha.*, p.nombres, p.apellidos
      FROM historial_atencion ha
      JOIN terapeuta t ON t.id_terapeuta = ha.id_terapeuta
      JOIN persona   p ON p.id_persona   = t.id_persona
      WHERE ha.id_ficha = ?
      ORDER BY ha.fecha_cambio DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
};

// Inserta filas hijas (consumo de sustancias y tratamientos anteriores)
async function insertChildren(conn, id_ficha, consumos, tratamientos) {
  for (const c of consumos || []) {
    if (!c.sustancia) continue;
    await conn.query(
      'INSERT INTO ficha_consumo (id_ficha, sustancia, edad_inicio, consumo_actual) VALUES (?, ?, ?, ?)',
      [id_ficha, c.sustancia, c.edad_inicio || null, c.consumo_actual || null]
    );
  }
  for (const t of tratamientos || []) {
    if (!t.institucion && !t.anio && !t.observacion) continue;
    await conn.query(
      'INSERT INTO tratamiento_anterior (id_ficha, institucion, anio, observacion) VALUES (?, ?, ?, ?)',
      [id_ficha, t.institucion || null, t.anio || null, t.observacion || null]
    );
  }
}

const create = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const {
      id_paciente, motivo_consulta, antecedentes, alergias, medicamentos, diagnostico_actual, observaciones,
      enfermedades_mentales, enfermedades_biologicas, edad_inicio_consumo, consumo_observaciones,
      historial_familiar, indicacion_intervencion, modalidad,
      consumos, tratamientos,
    } = req.body;
    if (req.user.rol === 'terapeuta' &&
        !(await terapeutaEnSucursal(req.user.id_terapeuta, await sucursalDePaciente(id_paciente)))) {
      await conn.rollback();
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const [result] = await conn.query(
      `INSERT INTO ficha_clinica
         (id_paciente, motivo_consulta, antecedentes, alergias, medicamentos, diagnostico_actual, observaciones,
          enfermedades_mentales, enfermedades_biologicas, edad_inicio_consumo, consumo_observaciones,
          historial_familiar, indicacion_intervencion, modalidad)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_paciente, motivo_consulta, antecedentes, alergias, medicamentos, diagnostico_actual, observaciones,
       enfermedades_mentales || null, enfermedades_biologicas || null, edad_inicio_consumo || null, consumo_observaciones || null,
       historial_familiar || null, indicacion_intervencion || null, modalidad || null]
    );
    await insertChildren(conn, result.insertId, consumos, tratamientos);
    await conn.commit();
    res.status(201).json({ id_ficha: result.insertId });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// Actualiza ficha y registra historial para campos modificados
const update = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      id_terapeuta, id_sesion, motivo_consulta, antecedentes, alergias, medicamentos, diagnostico_actual, observaciones,
      enfermedades_mentales, enfermedades_biologicas, edad_inicio_consumo, consumo_observaciones,
      historial_familiar, indicacion_intervencion, modalidad,
      consumos, tratamientos,
    } = req.body;

    if (!id_terapeuta) {
      await conn.rollback();
      return res.status(400).json({ error: 'id_terapeuta requerido para auditar cambios' });
    }

    const [fichas] = await conn.query('SELECT * FROM ficha_clinica WHERE id_ficha = ?', [req.params.id]);
    if (!fichas.length) { await conn.rollback(); return res.status(404).json({ error: 'Ficha no encontrada' }); }

    if (req.user.rol === 'terapeuta' &&
        !(await terapeutaEnSucursal(req.user.id_terapeuta, await sucursalDeFicha(req.params.id)))) {
      await conn.rollback();
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const ficha = fichas[0];
    const nuevos = {
      motivo_consulta, antecedentes, alergias, medicamentos, diagnostico_actual, observaciones,
      enfermedades_mentales, enfermedades_biologicas, edad_inicio_consumo, consumo_observaciones,
      historial_familiar, indicacion_intervencion, modalidad,
    };

    await conn.query(
      `UPDATE ficha_clinica SET motivo_consulta=?, antecedentes=?, alergias=?,
       medicamentos=?, diagnostico_actual=?, observaciones=?,
       enfermedades_mentales=?, enfermedades_biologicas=?, edad_inicio_consumo=?, consumo_observaciones=?,
       historial_familiar=?, indicacion_intervencion=?, modalidad=? WHERE id_ficha=?`,
      [motivo_consulta, antecedentes, alergias, medicamentos, diagnostico_actual, observaciones,
       enfermedades_mentales || null, enfermedades_biologicas || null, edad_inicio_consumo || null, consumo_observaciones || null,
       historial_familiar || null, indicacion_intervencion || null, modalidad || null, req.params.id]
    );

    for (const campo of CAMPOS_AUDITABLES) {
      const anterior = ficha[campo] ?? null;
      const nuevo = nuevos[campo] ?? null;
      if (anterior !== nuevo) {
        await conn.query(
          `INSERT INTO historial_atencion (id_ficha, id_sesion, id_terapeuta, campo_modificado, valor_anterior, valor_nuevo)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [req.params.id, id_sesion || null, id_terapeuta, campo, anterior, nuevo]
        );
      }
    }

    // Reemplaza filas hijas (consumo + tratamientos) si vienen en el body
    if (consumos !== undefined) {
      await conn.query('DELETE FROM ficha_consumo WHERE id_ficha = ?', [req.params.id]);
    }
    if (tratamientos !== undefined) {
      await conn.query('DELETE FROM tratamiento_anterior WHERE id_ficha = ?', [req.params.id]);
    }
    await insertChildren(conn, req.params.id, consumos, tratamientos);

    await conn.commit();
    res.json({ message: 'Ficha actualizada' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

module.exports = { getAll, getById, getHistorial, create, update };
