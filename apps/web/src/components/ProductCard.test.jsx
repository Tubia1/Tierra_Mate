import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { product } from '../test/fixtures.js';
import { ProductCard } from './ProductCard.jsx';

describe('ProductCard', () => {
  it('muestra datos reales y enlace al detalle', () => {
    render(<MemoryRouter><ProductCard product={product} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: product.name })).toBeInTheDocument();
    expect(screen.getByText('Mates')).toBeInTheDocument();
    expect(screen.getByText('Disponible')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver detalle' })).toHaveAttribute('href', '/productos/2');
    expect(screen.getByAltText(product.name)).toHaveAttribute('src', product.primary_image_url);
  });

  it('indica sin stock cuando todas las unidades físicas están reservadas', () => {
    render(<MemoryRouter><ProductCard product={{ ...product, physical_stock: 8, available_stock: 0 }} /></MemoryRouter>);
    expect(screen.getByText('Sin stock')).toBeInTheDocument();
  });
});
