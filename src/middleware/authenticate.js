const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Cookie httpOnly tiene prioridad; cabecera Bearer como respaldo (APIs/herramientas)
  let token = req.cookies?.token;
  if (!token) {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      token = header.slice(7);
    }
  }
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
