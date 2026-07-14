const { enviarPostulacion } = require('../utils/mailer');

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// POST /api/postulaciones  (multipart/form-data: nombre, celular, correo, cv)
const create = async (req, res, next) => {
  try {
    const { nombre, celular, correo } = req.body;

    if (!nombre || !celular || !correo || !req.file) {
      return res.status(400).json({ error: 'Completa nombre, celular, correo y adjunta tu CV.' });
    }
    if (!EMAIL_RE.test(correo)) {
      return res.status(400).json({ error: 'Correo electrónico inválido.' });
    }

    await enviarPostulacion({ nombre, celular, correo, cv: req.file });
    res.status(200).json({ message: 'Postulación enviada' });
  } catch (err) { next(err); }
};

module.exports = { create };
