const db = require('../config/db');

// ¿El terapeuta tiene asignación activa en esa sucursal?
async function terapeutaEnSucursal(id_terapeuta, id_sucursal) {
  if (id_terapeuta == null || id_sucursal == null) return false;
  const [rows] = await db.query(
    `SELECT 1 FROM terapeuta_sucursal
     WHERE id_terapeuta = ? AND id_sucursal = ?
       AND (fecha_fin IS NULL OR fecha_fin >= CURDATE())
     LIMIT 1`,
    [id_terapeuta, id_sucursal]
  );
  return rows.length > 0;
}

// Sucursal a la que pertenece una sesión (o null si no existe)
async function sucursalDeSesion(id_sesion) {
  const [rows] = await db.query('SELECT id_sucursal FROM sesion WHERE id_sesion = ?', [id_sesion]);
  return rows.length ? rows[0].id_sucursal : null;
}

// Sucursal del paciente dueño de una ficha (o null si no existe)
async function sucursalDeFicha(id_ficha) {
  const [rows] = await db.query(
    `SELECT pac.id_sucursal
     FROM ficha_clinica fc
     JOIN paciente pac ON pac.id_paciente = fc.id_paciente
     WHERE fc.id_ficha = ?`,
    [id_ficha]
  );
  return rows.length ? rows[0].id_sucursal : null;
}

// Sucursal de un paciente (o null si no existe)
async function sucursalDePaciente(id_paciente) {
  const [rows] = await db.query('SELECT id_sucursal FROM paciente WHERE id_paciente = ?', [id_paciente]);
  return rows.length ? rows[0].id_sucursal : null;
}

module.exports = { terapeutaEnSucursal, sucursalDeSesion, sucursalDeFicha, sucursalDePaciente };
