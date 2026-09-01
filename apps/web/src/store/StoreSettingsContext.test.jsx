import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StoreSettingsProvider } from './StoreSettingsContext.jsx';
import { Footer } from '../components/Footer.jsx';
import { Price } from '../components/Price.jsx';

describe('StoreSettingsProvider', () => {
  it('carga una vez y conecta footer, nombre y moneda', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ data: { store_name: 'Mate Luján', whatsapp_url: 'https://wa.me/5491112345678', currency: 'USD', reservation_minutes: 45 } }) });
    render(<StoreSettingsProvider><MemoryRouter><Footer /><Price value={25} /></MemoryRouter></StoreSettingsProvider>);
    expect(await screen.findByText('Mate Luján')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'WhatsApp de Mate Luján' })).toHaveAttribute('href', 'https://wa.me/5491112345678');
    expect(screen.getAllByText(/US\$|USD/).length).toBeGreaterThan(0);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('mantiene fallback y no muestra WhatsApp si falla la consulta', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('sin red'));
    render(<StoreSettingsProvider><MemoryRouter><Footer /></MemoryRouter></StoreSettingsProvider>);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(screen.getByText('Tierra Mate Shop')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /WhatsApp de/ })).not.toBeInTheDocument();
    expect(screen.getByText(/ARS/)).toBeInTheDocument();
  });
});
