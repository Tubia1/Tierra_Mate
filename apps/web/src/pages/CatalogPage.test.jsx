import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { catalogApi } from '../services/api.js';
import { product } from '../test/fixtures.js';
import { CatalogPage } from './CatalogPage.jsx';

it('descarta una página de Todos que llega después de cambiar a Sets', async () => {
  let finishOldPage;
  const oldPage = new Promise((resolve) => { finishOldPage = resolve; });
  vi.spyOn(catalogApi, 'getCategories').mockResolvedValue({ data: [{ id: 3, name: 'Sets' }] });
  const products = vi.spyOn(catalogApi, 'getProducts')
    .mockResolvedValueOnce({ data: [product], pagination: { next_cursor: '2' } })
    .mockReturnValueOnce(oldPage)
    .mockResolvedValueOnce({ data: [{ ...product, id: '9', name: 'Set matero' }] });

  render(<MemoryRouter><CatalogPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Cargar más' }));
  const signal = products.mock.calls[1][1].signal;
  fireEvent.click(screen.getByRole('button', { name: 'Sets' }));
  expect(signal.aborted).toBe(true);
  expect(products.mock.calls[2][0].category_id).toBe('3');
  expect(await screen.findByRole('heading', { name: 'Set matero' })).toBeInTheDocument();

  await act(async () => { finishOldPage({ data: [product], pagination: { next_cursor: '4' } }); });
  expect(screen.queryByRole('heading', { name: product.name })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument();
});
