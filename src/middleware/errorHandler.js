function errorHandler(err, req, res, next) {
  // Detalle completo solo en el log del servidor, nunca al cliente
  console.error(err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Registro duplicado' });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: 'Referencia inválida' });
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: 'No se puede eliminar: registro referenciado' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'El archivo supera el tamaño máximo permitido' });
  }

  const status = err.status || 500;
  // Errores 5xx no exponen el mensaje interno; los 4xx con status explícito sí
  const message = status >= 500 ? 'Error interno del servidor' : (err.message || 'Solicitud inválida');
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
