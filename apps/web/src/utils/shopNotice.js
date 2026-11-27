import Swal from 'sweetalert2/dist/sweetalert2.esm.js';
import 'sweetalert2/dist/sweetalert2.min.css';

// Text fields deliberately avoid interpreting product names or API values as HTML.
export function shopNotice(title, text) {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return Swal.fire({ titleText: title, text, icon: 'success', toast: true, position: 'bottom-end',
    showConfirmButton: false, showCloseButton: true, closeButtonAriaLabel: 'Cerrar aviso',
    timer: 5000, timerProgressBar: true, customClass: { popup: 'shop-notice' },
    ...(reduced ? { showClass: { popup: '' }, hideClass: { popup: '' } } : {}),
    didOpen: (toast) => { toast.onmouseenter = Swal.stopTimer; toast.onmouseleave = Swal.resumeTimer; },
  });
}
