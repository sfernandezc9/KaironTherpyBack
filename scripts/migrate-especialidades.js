require('dotenv').config();
const db = require('../src/config/db');

async function migrate() {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // especialidad_1/2/3 ya existen si el contenedor se inició con el schema nuevo
    // Solo agregar columnas que falten
    const [cols] = await conn.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terapeuta'
        AND COLUMN_NAME IN ('especialidad_1','especialidad_2','especialidad_3')
    `);
    const existing = cols.map(c => c.COLUMN_NAME);

    if (!existing.includes('especialidad_1')) {
      await conn.query(`ALTER TABLE terapeuta
        CHANGE especialidad especialidad_1 VARCHAR(150) NOT NULL DEFAULT ''`);
      await conn.query(`ALTER TABLE terapeuta
        MODIFY COLUMN especialidad_1 VARCHAR(150) NOT NULL`);
    }
    if (!existing.includes('especialidad_2'))
      await conn.query(`ALTER TABLE terapeuta ADD COLUMN especialidad_2 VARCHAR(150) AFTER especialidad_1`);
    if (!existing.includes('especialidad_3'))
      await conn.query(`ALTER TABLE terapeuta ADD COLUMN especialidad_3 VARCHAR(150) AFTER especialidad_2`);

    const [nacCol] = await conn.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'persona' AND COLUMN_NAME = 'nacionalidad'
    `);
    if (!nacCol.length)
      await conn.query(`ALTER TABLE persona ADD COLUMN nacionalidad VARCHAR(100) AFTER direccion`);

    await conn.commit();
    console.log('Migration OK: especialidad_1/2/3 + nacionalidad added');
  } catch (err) {
    await conn.rollback();
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
