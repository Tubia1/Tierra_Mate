import Swal from 'sweetalert2/dist/sweetalert2.esm.js';
import { shopNotice } from './shopNotice.js';

vi.mock('sweetalert2/dist/sweetalert2.esm.js', () => ({ default: { fire: vi.fn().mockResolvedValue({}), stopTimer: vi.fn(), resumeTimer: vi.fn() } }));

it('muestra texto sin interpretar HTML, sin bloquear la compra y respeta movimiento reducido', () => {
  shopNotice('Agregado al carrito', '<img src=x onerror=alert(1)>');
  expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
    titleText: 'Agregado al carrito', text: '<img src=x onerror=alert(1)>',
    toast: true, showConfirmButton: false, showCloseButton: true,
    showClass: { popup: '' }, hideClass: { popup: '' },
  }));
  expect(Swal.fire.mock.calls[0][0]).not.toHaveProperty('html');
});
