require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

// Falla rápido si el secreto JWT no está configurado o es débil
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET no está configurado o es demasiado corto (mínimo 32 caracteres).');
  process.exit(1);
}

const app = express();

// Detrás de un reverse proxy (nginx, load balancer, etc.): confía en el primer hop
// para que req.ip/req.protocol reflejen al cliente real (rate limit, cookie secure, CORS same-origin)
app.set('trust proxy', 1);

// Orígenes permitidos para CORS (coma-separados en CORS_ORIGINS, o localhost por defecto)
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors((req, cb) => {
  const origin = req.header('Origin');
  // Permite herramientas sin origin (curl, apps móviles), el propio origen del server
  // (landing pública sirviendo su propio fetch) y orígenes en la lista
  const sameOrigin = origin === `${req.protocol}://${req.get('host')}`;
  const allowed = !origin || sameOrigin || allowedOrigins.includes(origin);
  cb(allowed ? null : new Error('Origen no permitido por CORS'), { origin: allowed, credentials: true });
}));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth',       require('./routes/auth.routes'));
app.use('/api/empresas',   require('./routes/empresa.routes'));
app.use('/api/sucursales', require('./routes/sucursal.routes'));
app.use('/api/personas',   require('./routes/persona.routes'));
app.use('/api/pacientes',  require('./routes/paciente.routes'));
app.use('/api/terapeutas', require('./routes/terapeuta.routes'));
app.use('/api/insumos',    require('./routes/insumo.routes'));
app.use('/api/stock',      require('./routes/stock.routes'));
app.use('/api/fichas',     require('./routes/fichaClinica.routes'));
app.use('/api/sesiones',   require('./routes/sesion.routes'));
app.use('/api/historial',  require('./routes/historial.routes'));
app.use('/api/informes',    require('./routes/informe.routes'));
app.use('/api/solicitudes', require('./routes/solicitud.routes'));
app.use('/api/postulaciones', require('./routes/postulacion.routes'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

// Landing pública en "/". La SPA de gestión clínica (login, dashboard, etc.)
// se sirve para el resto de rutas vía el catch-all de abajo.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/landing/index.html'));
});
app.use(express.static(path.join(__dirname, '../public/landing')));

app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`KaironTherapy API → http://localhost:${PORT}`));

module.exports = app;
