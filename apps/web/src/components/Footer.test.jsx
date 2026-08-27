import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Footer } from './Footer.jsx';

describe('Footer', () => {
  it('enlaza los perfiles de Instagram de los creadores', () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);

    expect(screen.getByRole('link', { name: '@octavio_dugo' })).toHaveAttribute(
      'href',
      'https://www.instagram.com/octavio_dugo/',
    );
    expect(screen.getByRole('link', { name: '@maximoferrara___' })).toHaveAttribute(
      'href',
      'https://www.instagram.com/maximoferrara___/',
    );
  });
});
