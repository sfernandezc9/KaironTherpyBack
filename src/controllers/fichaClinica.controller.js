const db = require('../config/db');

const CAMPOS_AUDITABLES = [
  'motivo_consulta', 'antecedentes', 'alergias',
  'medicamentos', 'diagnostico_actual', 'observaciones'
];

const getAll = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT fc.*, p.nombres, p.apellidos, p.rut
      FROM ficha_clinica fc
      JOIN paciente pac ON pac.id_paciente = fc.id_paciente
      JOIN persona  p   ON p.id_persona    = pac.id_persona
      ORDER BY p.apellidos, p.nombres
    `);
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
    res.json(rows[0]);
  } catch (err) { next(err); }
};

const getHistorial = async (req, res, next) => {
  try {
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

const create = async (req, res, next) => {
  try {
    const { id_paciente, motivo_consulta, antecedentes, alergias, medicamentos, diagnostico_actual, observaciones } = req.body;
    const [result] = await db.query(
      `INSERT INTO ficha_clinica
         (id_paciente, motivo_consulta, antecedentes, alergias, medicamentos, diagnostico_actual, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_paciente, motivo_consulta, antecedentes, alergias, medicamentos, diagnostico_actual, observaciones]
    );
    res.status(201).json({ id_ficha: result.insertId });
  } catch (err) { next(err); }
};

// Actualiza ficha y registra historial para campos modificados
const update = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { id_terapeuta, id_sesion, motivo_consulta, antecedentes, alergias, medicamentos, diagnostico_actual, observaciones } = req.body;

    if (!id_terapeuta) {
      await conn.rollback();
      return res.status(400).json({ error: 'id_terapeuta requerido para auditar cambios' });
    }

    const [fichas] = await conn.query('SELECT * FROM ficha_clinica WHERE id_ficha = ?', [req.params.id]);
    if (!fichas.length) { await conn.rollback(); return res.status(404).json({ error: 'Ficha no encontrada' }); }

    const ficha = fichas[0];
    const nuevos = { motivo_consulta, antecedentes, alergias, medicamentos, diagnostico_actual, observaciones };

    await conn.query(
      `UPDATE ficha_clinica SET motivo_consulta=?, antecedentes=?, alergias=?,
       medicamentos=?, diagnostico_actual=?, observaciones=? WHERE id_ficha=?`,
      [motivo_consulta, antecedentes, alergias, medicamentos, diagnostico_actual, observaciones, req.params.id]
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
