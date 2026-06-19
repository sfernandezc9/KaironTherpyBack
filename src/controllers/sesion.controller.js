const db = require('../config/db');
const path = require('path');
const fs = require('fs');

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
    if (id_sucursal) { sql += ' AND ses.id_sucursal = ?'; params.push(id_sucursal); }
    if (req.user.rol === 'terapeuta') {
      sql += ` AND ses.id_sucursal IN (
        SELECT id_sucursal FROM terapeuta_sucursal
        WHERE id_terapeuta = ? AND (fecha_fin IS NULL OR fecha_fin >= CURDATE())
      )`;
      params.push(req.user.id_terapeuta);
    } else if (id_terapeuta) {
      sql += ' AND ses.id_terapeuta = ?';
      params.push(id_terapeuta);
    }
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
      SELECT si_uso.id, si_uso.id_sesion, si_uso.id_stock, si_uso.cantidad_usada, si_uso.created_at AS fecha_asignacion,
             i.nombre AS nombre_insumo, i.unidad_medida
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
    const { id_ficha, id_terapeuta, id_sucursal, fecha, duracion_minutos, estado, notas_sesion,
            observaciones, tipo_observacion, nuevas_indicaciones,
            consumos_adicciones, ley_karin, psicosocial, prevencion_suicidio, tipo_intervencion } = req.body;

    // Un paciente con alta no admite más sesiones
    const [alta] = await db.query(
      "SELECT id_sesion FROM sesion WHERE id_ficha = ? AND estado = 'de_alta' LIMIT 1",
      [id_ficha]
    );
    if (alta.length) {
      return res.status(409).json({ error: 'El paciente ya tiene un alta registrada; no se pueden crear más sesiones' });
    }

    const [result] = await db.query(
      `INSERT INTO sesion (id_ficha, id_terapeuta, id_sucursal, fecha, duracion_minutos, estado,
                           notas_sesion, observaciones, tipo_observacion, nuevas_indicaciones,
                           consumos_adicciones, ley_karin, psicosocial, prevencion_suicidio, tipo_intervencion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_ficha, id_terapeuta, id_sucursal, fecha || new Date(), duracion_minutos, estado || 'realizada',
       notas_sesion, observaciones || null, tipo_observacion || null, nuevas_indicaciones || null,
       consumos_adicciones ?? false, ley_karin ?? false, psicosocial ?? false, prevencion_suicidio ?? false,
       tipo_intervencion || null]
    );
    res.status(201).json({ id_sesion: result.insertId });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const allowed = ['id_terapeuta', 'id_sucursal', 'fecha', 'duracion_minutos', 'estado', 'notas_sesion',
                     'observaciones', 'tipo_observacion', 'nuevas_indicaciones',
                     'consumos_adicciones', 'ley_karin', 'psicosocial', 'prevencion_suicidio', 'tipo_intervencion'];
    const fields = allowed.filter(f => req.body[f] !== undefined);
    if (!fields.length) return res.status(400).json({ error: 'No hay campos para actualizar' });

    // Solo puede existir un alta por paciente
    if (req.body.estado === 'de_alta') {
      const [otra] = await db.query(
        `SELECT s2.id_sesion
         FROM sesion s1
         JOIN sesion s2 ON s2.id_ficha = s1.id_ficha
         WHERE s1.id_sesion = ? AND s2.estado = 'de_alta' AND s2.id_sesion <> s1.id_sesion
         LIMIT 1`,
        [req.params.id]
      );
      if (otra.length) {
        return res.status(409).json({ error: 'El paciente ya tiene un alta registrada' });
      }
    }

    const sql = `UPDATE sesion SET ${fields.map(f => `${f}=?`).join(', ')} WHERE id_sesion=?`;
    const params = [...fields.map(f => req.body[f]), req.params.id];
    const [result] = await db.query(sql, params);
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

// Stock disponible en una sucursal — para que terapeuta seleccione insumos al crear sesión
const getStockSucursal = async (req, res, next) => {
  try {
    const { id_sucursal } = req.params;

    // Terapeuta solo puede consultar sucursales asignadas
    if (req.user.rol === 'terapeuta') {
      const [asignaciones] = await db.query(
        `SELECT 1 FROM terapeuta_sucursal
         WHERE id_terapeuta = ? AND id_sucursal = ?
           AND (fecha_fin IS NULL OR fecha_fin >= CURDATE())`,
        [req.user.id_terapeuta, id_sucursal]
      );
      if (!asignaciones.length) {
        return res.status(403).json({ error: 'No tienes asignación en esta sucursal' });
      }
    }

    const paraSolicitud = req.query.para_solicitud === '1';
    const [rows] = await db.query(
      `SELECT si.id_stock, i.id_insumo, i.nombre, i.unidad_medida, si.cantidad, si.cantidad_minima
       FROM stock_insumo si
       JOIN insumo i ON i.id_insumo = si.id_insumo
       WHERE si.id_sucursal = ?${paraSolicitud ? '' : ' AND si.cantidad > 0'}
       ORDER BY i.nombre`,
      [id_sucursal]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

const uploadArchivo = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    const { id } = req.params;
    const [rows] = await db.query('SELECT archivo_path FROM sesion WHERE id_sesion = ?', [id]);
    if (!rows.length) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    // Elimina archivo anterior si existe
    if (rows[0].archivo_path) {
      const prev = path.join(__dirname, '../../', rows[0].archivo_path);
      if (fs.existsSync(prev)) fs.unlinkSync(prev);
    }

    const relativePath = path.join('uploads/sesiones', req.file.filename).replace(/\\/g, '/');
    await db.query(
      'UPDATE sesion SET archivo_path = ?, archivo_nombre = ? WHERE id_sesion = ?',
      [relativePath, req.file.originalname, id]
    );

    res.json({ archivo_nombre: req.file.originalname, archivo_path: relativePath });
  } catch (err) { next(err); }
};

const downloadArchivo = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT archivo_path, archivo_nombre FROM sesion WHERE id_sesion = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Sesión no encontrada' });
    if (!rows[0].archivo_path) return res.status(404).json({ error: 'Esta sesión no tiene archivo adjunto' });

    const fullPath = path.join(__dirname, '../../', rows[0].archivo_path);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Archivo no encontrado en disco' });

    res.download(fullPath, rows[0].archivo_nombre);
  } catch (err) { next(err); }
};

const deleteArchivo = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT archivo_path FROM sesion WHERE id_sesion = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Sesión no encontrada' });
    if (!rows[0].archivo_path) return res.status(404).json({ error: 'Esta sesión no tiene archivo adjunto' });

    const fullPath = path.join(__dirname, '../../', rows[0].archivo_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    await db.query('UPDATE sesion SET archivo_path = NULL, archivo_nombre = NULL WHERE id_sesion = ?', [req.params.id]);
    res.json({ message: 'Archivo eliminado' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, getInsumos, create, update, addInsumo, removeInsumo, remove, getStockSucursal, uploadArchivo, downloadArchivo, deleteArchivo };
