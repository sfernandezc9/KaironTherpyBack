const db = require('../config/db');

// GET /api/solicitudes
// admin: todas | terapeuta: solo las suyas
const getAll = async (req, res, next) => {
  try {
    let query, params;
    if (req.user.rol === 'terapeuta') {
      query = `
        SELECT sol.*, si.nombre_insumo, si.unidad_medida, s.nombre AS nombre_sucursal,
               CONCAT(p.nombres, ' ', p.apellidos) AS nombre_terapeuta
        FROM solicitud_insumo sol
        JOIN (
          SELECT sk.id_stock, i.nombre AS nombre_insumo, i.unidad_medida
          FROM stock_insumo sk JOIN insumo i ON i.id_insumo = sk.id_insumo
        ) si ON si.id_stock = sol.id_stock
        JOIN sucursal s ON s.id_sucursal = sol.id_sucursal
        JOIN terapeuta t ON t.id_terapeuta = sol.id_terapeuta
        JOIN persona p   ON p.id_persona   = t.id_persona
        WHERE sol.id_terapeuta = ?
        ORDER BY sol.created_at DESC
      `;
      params = [req.user.id_terapeuta];
    } else {
      query = `
        SELECT sol.*, si.nombre_insumo, si.unidad_medida, s.nombre AS nombre_sucursal,
               CONCAT(p.nombres, ' ', p.apellidos) AS nombre_terapeuta
        FROM solicitud_insumo sol
        JOIN (
          SELECT sk.id_stock, i.nombre AS nombre_insumo, i.unidad_medida
          FROM stock_insumo sk JOIN insumo i ON i.id_insumo = sk.id_insumo
        ) si ON si.id_stock = sol.id_stock
        JOIN sucursal s ON s.id_sucursal = sol.id_sucursal
        JOIN terapeuta t ON t.id_terapeuta = sol.id_terapeuta
        JOIN persona p   ON p.id_persona   = t.id_persona
        ORDER BY sol.created_at DESC
      `;
      params = [];
    }
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
};

// POST /api/solicitudes  { id_stock, cantidad, notas }
// terapeuta only — verifies they are assigned to that sucursal
const create = async (req, res, next) => {
  try {
    const { id_stock, cantidad, notas } = req.body;

    // get sucursal for this stock entry
    const [stockRows] = await db.query(
      'SELECT id_sucursal FROM stock_insumo WHERE id_stock = ?',
      [id_stock]
    );
    if (!stockRows.length) return res.status(404).json({ error: 'Stock no encontrado' });
    const id_sucursal = stockRows[0].id_sucursal;

    // verify terapeuta is assigned to this sucursal
    const [asig] = await db.query(
      `SELECT 1 FROM terapeuta_sucursal
       WHERE id_terapeuta = ? AND id_sucursal = ?
         AND (fecha_fin IS NULL OR fecha_fin > CURDATE())`,
      [req.user.id_terapeuta, id_sucursal]
    );
    if (!asig.length) return res.status(403).json({ error: 'No tienes asignación activa en esta sucursal' });

    const [result] = await db.query(
      `INSERT INTO solicitud_insumo (id_sucursal, id_stock, id_terapeuta, cantidad, notas)
       VALUES (?, ?, ?, ?, ?)`,
      [id_sucursal, id_stock, req.user.id_terapeuta, cantidad, notas || null]
    );
    res.status(201).json({ id_solicitud: result.insertId });
  } catch (err) { next(err); }
};

// PUT /api/solicitudes/:id/aprobar  { notas_respuesta?, cantidad? }
// admin: approves and auto-transfers from proveedor
const aprobar = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { notas_respuesta } = req.body;

    const [solRows] = await conn.query(
      'SELECT * FROM solicitud_insumo WHERE id_solicitud = ? AND estado = "pendiente"',
      [req.params.id]
    );
    if (!solRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Solicitud no encontrada o ya procesada' });
    }
    const sol = solRows[0];

    // find proveedor stock for this insumo
    const [stockRow] = await conn.query(
      'SELECT sk.id_insumo FROM stock_insumo sk WHERE sk.id_stock = ?',
      [sol.id_stock]
    );
    const id_insumo = stockRow[0].id_insumo;

    const [provRow] = await conn.query(
      'SELECT * FROM stock_proveedor WHERE id_insumo = ?',
      [id_insumo]
    );
    if (!provRow.length || provRow[0].cantidad < sol.cantidad) {
      await conn.rollback();
      return res.status(400).json({ error: 'Stock insuficiente en bodega central para aprobar esta solicitud' });
    }
    const prov = provRow[0];

    // transfer: deduct proveedor, add sucursal
    await conn.query(
      'UPDATE stock_proveedor SET cantidad = cantidad - ? WHERE id_stock_proveedor = ?',
      [sol.cantidad, prov.id_stock_proveedor]
    );
    await conn.query(
      'UPDATE stock_insumo SET cantidad = cantidad + ? WHERE id_stock = ?',
      [sol.cantidad, sol.id_stock]
    );
    await conn.query(
      `INSERT INTO transferencia_stock (id_stock_proveedor, id_stock, cantidad, id_usuario, notas)
       VALUES (?, ?, ?, ?, ?)`,
      [prov.id_stock_proveedor, sol.id_stock, sol.cantidad, req.user.id_usuario, `Solicitud #${sol.id_solicitud} aprobada`]
    );

    await conn.query(
      'UPDATE solicitud_insumo SET estado = "aprobada", notas_respuesta = ? WHERE id_solicitud = ?',
      [notas_respuesta || null, sol.id_solicitud]
    );

    await conn.commit();
    res.json({ message: 'Solicitud aprobada y stock transferido' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// PUT /api/solicitudes/:id/rechazar  { notas_respuesta? }
const rechazar = async (req, res, next) => {
  try {
    const { notas_respuesta } = req.body;
    const [result] = await db.query(
      'UPDATE solicitud_insumo SET estado = "rechazada", notas_respuesta = ? WHERE id_solicitud = ? AND estado = "pendiente"',
      [notas_respuesta || null, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Solicitud no encontrada o ya procesada' });
    res.json({ message: 'Solicitud rechazada' });
  } catch (err) { next(err); }
};

module.exports = { getAll, create, aprobar, rechazar };
