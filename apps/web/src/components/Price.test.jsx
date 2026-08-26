import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Price } from './Price.jsx';
import { formatPrice } from '../utils/formatPrice.js';

describe('Price', () => {
  it('formatea importes en pesos argentinos', () => {
    render(<Price value={25000} />);
    expect(screen.getByText(/\$\s*25\.000/)).toBeInTheDocument();
    expect(formatPrice(25000)).toMatch(/25[.\s]000/);
  });
});
