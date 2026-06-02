const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const ROLES = ['administrador', 'terapeuta'];

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.email, u.password_hash, u.rol, u.activo,
              p.nombres, p.apellidos, p.id_persona,
              t.id_terapeuta
       FROM usuario u
       JOIN persona p ON p.id_persona = u.id_persona
       LEFT JOIN terapeuta t ON t.id_persona = u.id_persona
       WHERE u.email = ?`,
      [email]
    );

    if (!rows.length || !rows[0].activo) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    await pool.query('UPDATE usuario SET ultimo_login = NOW() WHERE id_usuario = ?', [user.id_usuario]);

    const payload = {
      id_usuario: user.id_usuario,
      id_persona: user.id_persona,
      id_terapeuta: user.id_terapeuta || null,
      rol: user.rol,
      email: user.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    res.json({
      token,
      usuario: {
        id_usuario: user.id_usuario,
        email: user.email,
        rol: user.rol,
        nombres: user.nombres,
        apellidos: user.apellidos,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.email, u.rol, u.ultimo_login,
              p.id_persona, p.nombres, p.apellidos, p.rut, p.telefono,
              t.id_terapeuta
       FROM usuario u
       JOIN persona p ON p.id_persona = u.id_persona
       LEFT JOIN terapeuta t ON t.id_persona = u.id_persona
       WHERE u.id_usuario = ?`,
      [req.user.id_usuario]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const data = rows[0];

    if (data.id_terapeuta) {
      const [sucursales] = await pool.query(
        `SELECT s.id_sucursal, s.nombre, s.direccion, ts.fecha_inicio, ts.fecha_fin
         FROM terapeuta_sucursal ts
         JOIN sucursal s ON s.id_sucursal = ts.id_sucursal
         WHERE ts.id_terapeuta = ? AND (ts.fecha_fin IS NULL OR ts.fecha_fin >= CURDATE())`,
        [data.id_terapeuta]
      );
      data.sucursales = sucursales;
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { id_persona, email, password, rol } = req.body;
    if (!id_persona || !email || !password || !rol) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    if (!ROLES.includes(rol)) {
      return res.status(400).json({ error: `Rol inválido. Opciones: ${ROLES.join(', ')}` });
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO usuario (id_persona, email, password_hash, rol) VALUES (?, ?, ?, ?)',
      [id_persona, email, hash, rol]
    );
    res.status(201).json({ id_usuario: result.insertId, email, rol });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email o persona ya tiene usuario' });
    }
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password_actual, password_nuevo } = req.body;

    // Terapeuta solo puede cambiar su propia contraseña
    if (req.user.rol === 'terapeuta' && req.user.id_usuario !== Number(id)) {
      return res.status(403).json({ error: 'Solo puedes cambiar tu propia contraseña' });
    }

    const [rows] = await pool.query('SELECT password_hash FROM usuario WHERE id_usuario = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (req.user.rol === 'terapeuta') {
      const valid = await bcrypt.compare(password_actual, rows[0].password_hash);
      if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    const hash = await bcrypt.hash(password_nuevo, 12);
    await pool.query('UPDATE usuario SET password_hash = ? WHERE id_usuario = ?', [hash, id]);
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    next(err);
  }
};

exports.deactivate = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE usuario SET activo = FALSE WHERE id_usuario = ?', [id]);
    res.json({ message: 'Usuario desactivado' });
  } catch (err) {
    next(err);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.email, u.rol, u.activo, u.ultimo_login,
              p.nombres, p.apellidos, p.rut
       FROM usuario u
       JOIN persona p ON p.id_persona = u.id_persona
       ORDER BY p.apellidos, p.nombres`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};
