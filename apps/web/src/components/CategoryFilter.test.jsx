import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { category } from '../test/fixtures.js';
import { CategoryFilter } from './CategoryFilter.jsx';

describe('CategoryFilter', () => {
  it('notifica la categoría seleccionada', async () => {
    const onChange = vi.fn();
    render(<CategoryFilter categories={[category]} value="" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Mates' }));
    expect(onChange).toHaveBeenCalledWith('1');
  });
});
