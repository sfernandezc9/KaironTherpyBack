const db = require('../config/db');
const { terapeutaEnSucursal, sucursalDeFicha } = require('../utils/access');

const getAll = async (req, res, next) => {
  try {
    const { id_ficha, id_terapeuta, campo } = req.query;
    let sql = `
      SELECT ha.*, p.nombres, p.apellidos
      FROM historial_atencion ha
      JOIN terapeuta t ON t.id_terapeuta = ha.id_terapeuta
      JOIN persona   p ON p.id_persona   = t.id_persona
      WHERE 1=1
    `;
    const params = [];
    if (req.user.rol === 'terapeuta') {
      sql += ` AND ha.id_ficha IN (
        SELECT fc.id_ficha FROM ficha_clinica fc
        JOIN paciente pac ON pac.id_paciente = fc.id_paciente
        WHERE pac.id_sucursal IN (
          SELECT id_sucursal FROM terapeuta_sucursal
          WHERE id_terapeuta = ? AND (fecha_fin IS NULL OR fecha_fin >= CURDATE())
        )
      )`;
      params.push(req.user.id_terapeuta);
    }
    if (id_ficha)     { sql += ' AND ha.id_ficha = ?';          params.push(id_ficha); }
    if (id_terapeuta) { sql += ' AND ha.id_terapeuta = ?';      params.push(id_terapeuta); }
    if (campo)        { sql += ' AND ha.campo_modificado = ?';  params.push(campo); }
    sql += ' ORDER BY ha.fecha_cambio DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT ha.*, p.nombres, p.apellidos
      FROM historial_atencion ha
      JOIN terapeuta t ON t.id_terapeuta = ha.id_terapeuta
      JOIN persona   p ON p.id_persona   = t.id_persona
      WHERE ha.id_historial = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Registro no encontrado' });
    if (req.user.rol === 'terapeuta' &&
        !(await terapeutaEnSucursal(req.user.id_terapeuta, await sucursalDeFicha(rows[0].id_ficha)))) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
};

module.exports = { getAll, getById };
