import { act, renderHook, waitFor } from '@testing-library/react';
import { useAsync } from './useAsync.js';

it('cancela solicitudes al salir de la pantalla', async () => {
  let signal;
  const load = ({ signal: current }) => { signal = current; return new Promise(() => {}); };
  const { unmount } = renderHook(() => useAsync(load));
  expect(signal.aborted).toBe(false);
  unmount();
  expect(signal.aborted).toBe(true);
});

it('ignora una respuesta anterior si cambió el recurso', async () => {
  let finish;
  const first = new Promise((resolve) => { finish = resolve; });
  const { result, rerender } = renderHook(({ id }) => useAsync(() => id === 1 ? first : Promise.resolve('actual'), [id]), { initialProps: { id: 1 } });
  rerender({ id: 2 });
  await waitFor(() => expect(result.current.data).toBe('actual'));
  await act(async () => finish('anterior'));
  expect(result.current.data).toBe('actual');
});
