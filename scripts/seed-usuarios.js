require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

// ============================================================
// Seed: entorno de demostración completo
//   usuarios (admin + terapeutas) · empresas · sucursales ·
//   asignación terapeuta-sucursal · insumos + stock ·
//   pacientes + ficha clínica · sesiones (varios estados)
// Idempotente: se puede correr varias veces sin duplicar datos.
// ============================================================

// ---- Usuarios del sistema ------------------------------------------------
const usuarios = [
  {
    persona: { rut: '11111111-1', nombres: 'Admin', apellidos: 'KaironTherapy', email: 'admin@kairon.cl' },
    usuario: { email: 'admin@kairon.cl', password: 'Admin1234!', rol: 'administrador' },
  },
  {
    persona: { rut: '22222222-2', nombres: 'Camila', apellidos: 'Soto', email: 'terapeuta@kairon.cl' },
    usuario: { email: 'terapeuta@kairon.cl', password: 'Terapeuta1234!', rol: 'terapeuta' },
    terapeuta: { especialidad_1: 'Psicología clínica', registro_profesional: 'PSI-00001' },
  },
  {
    persona: { rut: '33333333-3', nombres: 'Diego', apellidos: 'Fuentes', email: 'terapeuta2@kairon.cl' },
    usuario: { email: 'terapeuta2@kairon.cl', password: 'Terapeuta1234!', rol: 'terapeuta' },
    terapeuta: { especialidad_1: 'Trabajo social', registro_profesional: 'TS-00002' },
  },
];

// ---- Empresas y sus sucursales -------------------------------------------
const empresas = [
  {
    nombre: 'Minera Los Andes',
    rut: '76111111-1',
    direccion: 'Av. Apoquindo 4500, Las Condes',
    telefono: '+56 2 2345 6789',
    email: 'contacto@minerandes.cl',
    sucursales: [
      { nombre: 'Casa Matriz Santiago', direccion: 'Av. Apoquindo 4500, Las Condes' },
      { nombre: 'Faena Calama', direccion: 'Ruta 25, Calama' },
    ],
  },
  {
    nombre: 'Constructora del Pacífico',
    rut: '77222222-2',
    direccion: 'Av. España 1200, Valparaíso',
    telefono: '+56 32 219 8800',
    email: 'rrhh@conpacifico.cl',
    sucursales: [
      { nombre: 'Oficina Valparaíso', direccion: 'Av. España 1200, Valparaíso' },
    ],
  },
];

// ---- Insumos --------------------------------------------------------------
const insumos = [
  { nombre: 'Guantes de nitrilo', descripcion: 'Caja 100 unidades', unidad_medida: 'caja' },
  { nombre: 'Alcohol gel', descripcion: 'Botella 500ml', unidad_medida: 'unidad' },
  { nombre: 'Mascarillas quirúrgicas', descripcion: 'Caja 50 unidades', unidad_medida: 'caja' },
];

// ---- Pacientes (se reparten entre las sucursales creadas) ----------------
const pacientes = [
  {
    persona: { rut: '12345678-5', nombres: 'María', apellidos: 'González', genero: 'Mujer',
      fecha_nacimiento: '1990-04-12', telefono: '+56 9 8111 1111', email: 'maria.gonzalez@mail.cl',
      direccion: 'Los Olmos 123, Santiago', nacionalidad: 'Chilena' },
    prevision: 'Fonasa',
    contacto_emergencia_nombre: 'Pedro González', contacto_emergencia_parentesco: 'Hermano',
    contacto_emergencia_telefono: '+56 9 8111 2222',
    empresaIdx: 0, sucursalIdx: 0,
    ficha: { motivo_consulta: 'Estrés laboral', diagnostico_actual: 'Trastorno adaptativo' },
    sesiones: [
      { dias_atras: 30, duracion_minutos: 60, estado: 'realizada', notas_sesion: 'Primera evaluación.' },
      { dias_atras: 16, duracion_minutos: 60, estado: 'realizada', notas_sesion: 'Avance en manejo de ansiedad.' },
      { dias_atras: 2,  duracion_minutos: 60, estado: 'realizada', notas_sesion: 'Cierre de proceso.' },
      { dias_atras: -7, duracion_minutos: 60, estado: 'pendiente', notas_sesion: 'Control de seguimiento.' },
    ],
  },
  {
    persona: { rut: '9876543-4', nombres: 'Juan', apellidos: 'Pérez', genero: 'Hombre',
      fecha_nacimiento: '1985-09-30', telefono: '+56 9 8222 1111', email: 'juan.perez@mail.cl',
      direccion: 'Ruta 25 s/n, Calama', nacionalidad: 'Chilena' },
    prevision: 'Isapre Banmédica',
    contacto_emergencia_nombre: 'Ana Pérez', contacto_emergencia_parentesco: 'Cónyuge',
    contacto_emergencia_telefono: '+56 9 8222 2222',
    empresaIdx: 0, sucursalIdx: 1,
    ficha: { motivo_consulta: 'Consumo problemático de alcohol', diagnostico_actual: 'Dependencia en remisión' },
    sesiones: [
      { dias_atras: 90, duracion_minutos: 45, estado: 'realizada', notas_sesion: 'Ingreso a tratamiento.' },
      { dias_atras: 60, duracion_minutos: 45, estado: 'realizada', notas_sesion: 'Buena adherencia.' },
      { dias_atras: 20, duracion_minutos: 45, estado: 'realizada', notas_sesion: 'Objetivos cumplidos.' },
      { dias_atras: 5,  duracion_minutos: 45, estado: 'de_alta',   notas_sesion: 'Alta terapéutica. Tratamiento finalizado.' },
    ],
  },
  {
    persona: { rut: '15678234-9', nombres: 'Valentina', apellidos: 'Rojas', genero: 'Mujer',
      fecha_nacimiento: '1998-01-22', telefono: '+56 9 8333 1111', email: 'valentina.rojas@mail.cl',
      direccion: 'Av. España 1200, Valparaíso', nacionalidad: 'Chilena' },
    prevision: 'Fonasa',
    contacto_emergencia_nombre: 'Carla Rojas', contacto_emergencia_parentesco: 'Madre',
    contacto_emergencia_telefono: '+56 9 8333 2222',
    empresaIdx: 1, sucursalIdx: 0,
    ficha: { motivo_consulta: 'Acompañamiento psicosocial', diagnostico_actual: 'En evaluación' },
    sesiones: [
      { dias_atras: 10, duracion_minutos: 60, estado: 'realizada', notas_sesion: 'Primera sesión.' },
      { dias_atras: 1,  duracion_minutos: 60, estado: 'cancelada', notas_sesion: 'Paciente no asiste.' },
    ],
  },
];

// ============================================================
// Helpers
// ============================================================
async function waitForDB(retries = 15, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await pool.getConnection();
      conn.release();
      return;
    } catch {
      console.log(`  Esperando DB... intento ${i}/${retries}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('No se pudo conectar a la DB');
}

async function getOrCreatePersona(conn, p) {
  const [ex] = await conn.query('SELECT id_persona FROM persona WHERE rut = ?', [p.rut]);
  if (ex.length) return ex[0].id_persona;
  const [r] = await conn.query(
    `INSERT INTO persona (rut, nombres, apellidos, fecha_nacimiento, genero, telefono, email, direccion, nacionalidad)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [p.rut, p.nombres, p.apellidos, p.fecha_nacimiento ?? null, p.genero ?? null,
     p.telefono ?? null, p.email ?? null, p.direccion ?? null, p.nacionalidad ?? null]
  );
  return r.insertId;
}

function fechaOffset(diasAtras) {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// ============================================================
// Seed
// ============================================================
async function seed() {
  await waitForDB();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ---- Usuarios + terapeutas ----
    const terapeutaIds = [];
    for (const { persona, usuario, terapeuta } of usuarios) {
      const id_persona = await getOrCreatePersona(conn, persona);

      if (terapeuta) {
        const [t] = await conn.query('SELECT id_terapeuta FROM terapeuta WHERE id_persona = ?', [id_persona]);
        let id_terapeuta;
        if (t.length) id_terapeuta = t[0].id_terapeuta;
        else {
          const [tr] = await conn.query(
            'INSERT INTO terapeuta (id_persona, especialidad_1, registro_profesional) VALUES (?, ?, ?)',
            [id_persona, terapeuta.especialidad_1, terapeuta.registro_profesional]
          );
          id_terapeuta = tr.insertId;
        }
        terapeutaIds.push(id_terapeuta);
      }

      const [u] = await conn.query('SELECT id_usuario FROM usuario WHERE email = ?', [usuario.email]);
      if (!u.length) {
        const hash = await bcrypt.hash(usuario.password, 12);
        await conn.query(
          'INSERT INTO usuario (id_persona, email, password_hash, rol) VALUES (?, ?, ?, ?)',
          [id_persona, usuario.email, hash, usuario.rol]
        );
        console.log(`  Usuario: ${usuario.email} / ${usuario.password} [${usuario.rol}]`);
      }
    }

    // ---- Empresas + sucursales ----
    const sucursalIds = []; // sucursalIds[empresaIdx][sucursalIdx] = id
    for (const emp of empresas) {
      const [ex] = await conn.query('SELECT id_empresa FROM empresa WHERE rut = ?', [emp.rut]);
      let id_empresa;
      if (ex.length) id_empresa = ex[0].id_empresa;
      else {
        const [r] = await conn.query(
          'INSERT INTO empresa (nombre, rut, direccion, telefono, email) VALUES (?, ?, ?, ?, ?)',
          [emp.nombre, emp.rut, emp.direccion, emp.telefono, emp.email]
        );
        id_empresa = r.insertId;
        console.log(`  Empresa: ${emp.nombre}`);
      }

      const sucs = [];
      for (const s of emp.sucursales) {
        const [se] = await conn.query(
          'SELECT id_sucursal FROM sucursal WHERE id_empresa = ? AND nombre = ?',
          [id_empresa, s.nombre]
        );
        let id_sucursal;
        if (se.length) id_sucursal = se[0].id_sucursal;
        else {
          const [r] = await conn.query(
            'INSERT INTO sucursal (id_empresa, nombre, direccion) VALUES (?, ?, ?)',
            [id_empresa, s.nombre, s.direccion]
          );
          id_sucursal = r.insertId;
          console.log(`    Sucursal: ${s.nombre}`);
        }
        sucs.push(id_sucursal);
      }
      sucursalIds.push(sucs);
    }

    // ---- Asignar terapeutas a todas las sucursales ----
    const todasSucursales = sucursalIds.flat();
    for (const id_terapeuta of terapeutaIds) {
      for (const id_sucursal of todasSucursales) {
        const [a] = await conn.query(
          'SELECT id FROM terapeuta_sucursal WHERE id_terapeuta = ? AND id_sucursal = ? AND fecha_fin IS NULL',
          [id_terapeuta, id_sucursal]
        );
        if (!a.length) {
          await conn.query(
            'INSERT INTO terapeuta_sucursal (id_terapeuta, id_sucursal) VALUES (?, ?)',
            [id_terapeuta, id_sucursal]
          );
        }
      }
    }

    // ---- Insumos + stock en cada sucursal ----
    const insumoIds = [];
    for (const ins of insumos) {
      const [ex] = await conn.query('SELECT id_insumo FROM insumo WHERE nombre = ?', [ins.nombre]);
      let id_insumo;
      if (ex.length) id_insumo = ex[0].id_insumo;
      else {
        const [r] = await conn.query(
          'INSERT INTO insumo (nombre, descripcion, unidad_medida) VALUES (?, ?, ?)',
          [ins.nombre, ins.descripcion, ins.unidad_medida]
        );
        id_insumo = r.insertId;
        console.log(`  Insumo: ${ins.nombre}`);
      }
      insumoIds.push(id_insumo);
    }
    for (const id_sucursal of todasSucursales) {
      for (const id_insumo of insumoIds) {
        const [ex] = await conn.query(
          'SELECT id_stock FROM stock_insumo WHERE id_sucursal = ? AND id_insumo = ?',
          [id_sucursal, id_insumo]
        );
        if (!ex.length) {
          await conn.query(
            'INSERT INTO stock_insumo (id_sucursal, id_insumo, cantidad, cantidad_minima) VALUES (?, ?, ?, ?)',
            [id_sucursal, id_insumo, 50, 10]
          );
        }
      }
    }

    // ---- Pacientes + ficha + sesiones ----
    const terapeutaPorDefecto = terapeutaIds[0];
    for (const pac of pacientes) {
      const id_sucursal = sucursalIds[pac.empresaIdx][pac.sucursalIdx];
      const id_persona = await getOrCreatePersona(conn, pac.persona);

      const [pe] = await conn.query('SELECT id_paciente FROM paciente WHERE id_persona = ?', [id_persona]);
      let id_paciente;
      if (pe.length) id_paciente = pe[0].id_paciente;
      else {
        const [r] = await conn.query(
          `INSERT INTO paciente (id_persona, id_sucursal, prevision,
             contacto_emergencia_nombre, contacto_emergencia_parentesco, contacto_emergencia_telefono)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id_persona, id_sucursal, pac.prevision,
           pac.contacto_emergencia_nombre, pac.contacto_emergencia_parentesco, pac.contacto_emergencia_telefono]
        );
        id_paciente = r.insertId;
        console.log(`  Paciente: ${pac.persona.nombres} ${pac.persona.apellidos}`);
      }

      const [fe] = await conn.query('SELECT id_ficha FROM ficha_clinica WHERE id_paciente = ?', [id_paciente]);
      let id_ficha;
      if (fe.length) id_ficha = fe[0].id_ficha;
      else {
        const [r] = await conn.query(
          'INSERT INTO ficha_clinica (id_paciente, motivo_consulta, diagnostico_actual) VALUES (?, ?, ?)',
          [id_paciente, pac.ficha.motivo_consulta, pac.ficha.diagnostico_actual]
        );
        id_ficha = r.insertId;
      }

      // Solo crear sesiones si la ficha no tiene ninguna (evita duplicar al re-correr)
      const [sc] = await conn.query('SELECT COUNT(*) AS n FROM sesion WHERE id_ficha = ?', [id_ficha]);
      if (sc[0].n === 0) {
        for (const s of pac.sesiones) {
          await conn.query(
            `INSERT INTO sesion (id_ficha, id_terapeuta, id_sucursal, fecha, duracion_minutos, estado, notas_sesion)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id_ficha, terapeutaPorDefecto, id_sucursal, fechaOffset(s.dias_atras),
             s.duracion_minutos, s.estado, s.notas_sesion]
          );
        }
        console.log(`    ${pac.sesiones.length} sesiones para ${pac.persona.apellidos}`);
      }
    }

    await conn.commit();
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
