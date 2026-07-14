const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function enviarPostulacion({ nombre, celular, correo, cv }) {
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: process.env.RECRUITER_EMAIL || 'marce@kairontherapy.com',
    replyTo: correo,
    subject: `Nueva postulación — ${nombre}`,
    text: `Nombre: ${nombre}\nCelular: ${celular}\nCorreo: ${correo}`,
    html: `
      <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
      <p><strong>Celular:</strong> ${escapeHtml(celular)}</p>
      <p><strong>Correo:</strong> ${escapeHtml(correo)}</p>
    `,
    attachments: [
      {
        filename: cv.originalname,
        content: cv.buffer,
        contentType: cv.mimetype,
      },
    ],
  });
}

module.exports = { enviarPostulacion };
