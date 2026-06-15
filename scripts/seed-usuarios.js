require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

const usuarios = [
  {
    persona: {
      rut: '11111111-1',
      nombres: 'Admin',
      apellidos: 'KaironTherapy',
      email: 'admin@kairon.cl',
    },
    usuario: {
      email: 'admin@kairon.cl',
      password: 'Admin1234!',
      rol: 'administrador',
    },
  },
  {
    persona: {
      rut: '22222222-2',
      nombres: 'Terapeuta',
      apellidos: 'Prueba',
      email: 'terapeuta@kairon.cl',
    },
    usuario: {
      email: 'terapeuta@kairon.cl',
      password: 'Terapeuta1234!',
      rol: 'terapeuta',
    },
    terapeuta: {
      especialidad_1: 'Kinesiología',
      registro_profesional: 'KIN-00001',
    },
  },
];

async function waitForDB(retries = 15, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await pool.getConnection();
      conn.release();
      return;
    } catch {
      console.log(`  Esperando DB... intento ${i}/${retries}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('No se pudo conectar a la DB');
}

async function seed() {
  await waitForDB();
  const conn = await pool.getConnection();
  try {
    for (const { persona, usuario, terapeuta } of usuarios) {
      await conn.beginTransaction();

      // Persona
      const [existing] = await conn.query('SELECT id_persona FROM persona WHERE rut = ?', [persona.rut]);
      let id_persona;
      if (existing.length) {
        id_persona = existing[0].id_persona;
        console.log(`  Persona ya existe: ${persona.rut} (id=${id_persona})`);
      } else {
        const [r] = await conn.query(
          'INSERT INTO persona (rut, nombres, apellidos, email) VALUES (?, ?, ?, ?)',
          [persona.rut, persona.nombres, persona.apellidos, persona.email]
        );
        id_persona = r.insertId;
        console.log(`  Persona creada: ${persona.rut} (id=${id_persona})`);
      }

      // Terapeuta (si aplica)
      if (terapeuta) {
        const [t] = await conn.query('SELECT id_terapeuta FROM terapeuta WHERE id_persona = ?', [id_persona]);
        if (!t.length) {
          await conn.query(
            'INSERT INTO terapeuta (id_persona, especialidad_1, registro_profesional) VALUES (?, ?, ?)',
            [id_persona, terapeuta.especialidad_1, terapeuta.registro_profesional]
          );
          console.log(`  Terapeuta creado`);
        }
      }

      // Usuario
      const [uExisting] = await conn.query('SELECT id_usuario FROM usuario WHERE email = ?', [usuario.email]);
      if (uExisting.length) {
        console.log(`  Usuario ya existe: ${usuario.email}`);
      } else {
        const hash = await bcrypt.hash(usuario.password, 12);
        await conn.query(
          'INSERT INTO usuario (id_persona, email, password_hash, rol) VALUES (?, ?, ?, ?)',
          [id_persona, usuario.email, hash, usuario.rol]
        );
        console.log(`  Usuario creado: ${usuario.email} / ${usuario.password} [${usuario.rol}]`);
      }

      await conn.commit();
    }

    console.log('\nSeed completado.');
  } catch (err) {
    await conn.rollback();
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seed();
