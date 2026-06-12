require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

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

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`KaironTherapy API → http://localhost:${PORT}`));

module.exports = app;
