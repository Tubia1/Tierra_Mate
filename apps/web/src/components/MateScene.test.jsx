import { fireEvent, render, screen } from '@testing-library/react';
import { MateScene } from './MateScene.jsx';

it('conserva una alternativa accesible cuando WebGL no está disponible', () => {
  const { container, unmount } = render(<MateScene />);
  expect(screen.getByRole('img', { name: 'Mate de madera ilustrado con bombilla curva' })).toBeInTheDocument();
  expect(container.querySelector('canvas')).toBeNull();
  expect(screen.getByText('Ilustración de Tierra Mate')).toBeInTheDocument();
  unmount();
});

it('inicia el modelo al pedirlo y libera la escena al volver a la ilustración', async () => {
  const dispose = vi.fn();
  const createMateScene = vi.fn(() => dispose);
  vi.stubGlobal('WebGL2RenderingContext', class {});
  vi.doMock('./three/createMateScene.js', () => ({ createMateScene }));
  try {
    render(<MateScene />);
    expect(createMateScene).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Explorar en 3D' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ver ilustración' }));
    expect(createMateScene).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Explorar en 3D' })).toBeInTheDocument();
  } finally {
    vi.doUnmock('./three/createMateScene.js');
    vi.unstubAllGlobals();
  }
});
