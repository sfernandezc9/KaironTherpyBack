(function () {
  var yearEl = document.getElementById('footer-year');
  yearEl.textContent = '© ' + new Date().getFullYear() + ' KAIRON SpA · Todos los derechos reservados';

  var form = document.getElementById('postulacion-form');
  var okBox = document.getElementById('postulacion-ok');
  var fileInput = document.getElementById('p-cv');
  var fileError = document.getElementById('p-file-error');
  var formError = document.getElementById('p-form-error');
  var submitBtn = document.getElementById('p-submit');

  function showError(el, msg) {
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
  }

  fileInput.addEventListener('change', function () {
    var f = fileInput.files[0];
    if (!f) { showError(fileError, ''); return; }
    var maxBytes = 10 * 1024 * 1024;
    var okExt = /\.(pdf|doc|docx)$/i.test(f.name);
    if (!okExt) {
      showError(fileError, 'Formato no válido. Sube un archivo PDF o Word.');
      fileInput.value = '';
      return;
    }
    if (f.size > maxBytes) {
      showError(fileError, 'El archivo supera los 10 MB permitidos.');
      fileInput.value = '';
      return;
    }
    showError(fileError, '');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    showError(formError, '');

    var nombre = document.getElementById('p-nombre').value.trim();
    var celular = document.getElementById('p-celular').value.trim();
    var correo = document.getElementById('p-correo').value.trim();
    var hasFile = fileInput.files && fileInput.files.length > 0;

    if (!nombre || !celular || !correo || !hasFile) {
      showError(formError, 'Completa nombre, celular, correo y adjunta tu CV.');
      return;
    }
    if (fileError.style.display === 'block') return;

    var fd = new FormData();
    fd.append('nombre', nombre);
    fd.append('celular', celular);
    fd.append('correo', correo);
    fd.append('cv', fileInput.files[0]);

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando…';

    fetch('/api/postulaciones', { method: 'POST', body: fd })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (data) {
            throw new Error(data && data.error ? data.error : 'No pudimos enviar tu postulación.');
          });
        }
        form.style.display = 'none';
        okBox.style.display = 'flex';
      })
      .catch(function (err) {
        showError(formError, err.message || 'No pudimos enviar tu postulación. Intenta nuevamente.');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar postulación';
      });
  });
})();
