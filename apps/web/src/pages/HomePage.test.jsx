import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { category, jsonResponse, product } from '../test/fixtures.js';
import { HomePage } from './HomePage.jsx';

function renderHome() { return render(<MemoryRouter><HomePage /></MemoryRouter>); }

describe('HomePage', () => {
  it('renderiza la portada y contenido cargado desde la API', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => url.toString().includes('/categories')
      ? jsonResponse([category], { next_cursor: null })
      : jsonResponse([product], { next_cursor: null }));
    renderHome();
    expect(screen.getByRole('heading', { name: /tradición del mate/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Logotipo ilustrado de Tierra Mate' }).getAttribute('src')).toContain('tierra-mate-home-transparent.png');
    expect(await screen.findByRole('heading', { name: product.name })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: category.name })).toBeInTheDocument();
  });

  it('muestra estado de carga mientras espera respuestas', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));
    renderHome();
    expect(screen.getAllByLabelText('Cargando contenido')).toHaveLength(2);
  });

  it('muestra estado de error y permite reintentar', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    renderHome();
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
    expect(screen.getAllByRole('button', { name: 'Reintentar' }).length).toBeGreaterThan(0);
  });
});
