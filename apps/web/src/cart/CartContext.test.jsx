import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CartProvider, createCartLineId, normalizeCart, useCart } from './CartContext.jsx';

const baseItem = {
  productId: '2', productName: 'Mate Imperial', variantId: '10', variantName: 'Negro',
  price: '1000', stock: 3, quantity: 1, imageUrl: null, personalizations: [],
};

function engraving(note, selectedValue = 'nombre') {
  return [{ optionId: '20', name: 'Grabado', selectedValue, customerNote: note, extraPrice: '100' }];
}

function CartHarness() {
  const cart = useCart();
  const [first, second] = cart.items;
  return <div>
    <output data-testid="items">{JSON.stringify(cart.items)}</output>
    <output data-testid="summary">{cart.itemCount}|{cart.subtotal}</output>
    <button onClick={() => cart.addItem(baseItem)}>Sin personalización</button>
    <button onClick={() => cart.addItem({ ...baseItem, personalizations: engraving(' Tobias ') })}>Tobias</button>
    <button onClick={() => cart.addItem({ ...baseItem, personalizations: engraving('Tobias') })}>Tobias limpio</button>
    <button onClick={() => cart.addItem({ ...baseItem, personalizations: engraving('tobias') })}>tobias</button>
    <button onClick={() => cart.addItem({ ...baseItem, personalizations: engraving('Matías') })}>Matías</button>
    <button onClick={() => first && cart.updateQuantity(first.cartLineId, 2)}>Actualizar primera</button>
    <button onClick={() => second && cart.removeItem(second.cartLineId)}>Eliminar segunda</button>
  </div>;
}

function readItems() {
  return JSON.parse(screen.getByTestId('items').textContent);
}

describe('CartContext', () => {
  it('genera una identidad estable ordenando opciones y recortando espacios sin cambiar mayúsculas', () => {
    const first = { variantId: 10, personalizations: [
      { optionId: 30, selectedValue: ' oro ', customerNote: '' },
      { optionId: 20, selectedValue: 'nombre', customerNote: ' Tobias ' },
    ] };
    const reordered = { variantId: '10', personalizations: [
      { optionId: '20', selectedValue: 'nombre', customerNote: 'Tobias' },
      { optionId: '30', selectedValue: 'oro', customerNote: '' },
    ] };
    expect(createCartLineId(first)).toBe(createCartLineId(reordered));
    expect(createCartLineId(first)).not.toBe(createCartLineId({ ...reordered, personalizations: engraving('tobias') }));
  });

  it('combina configuraciones iguales y separa contenido o mayúsculas diferentes', async () => {
    const user = userEvent.setup();
    render(<CartProvider><CartHarness /></CartProvider>);
    await user.click(screen.getByRole('button', { name: 'Tobias' }));
    await user.click(screen.getByRole('button', { name: 'Tobias limpio' }));
    expect(readItems()).toHaveLength(1);
    expect(readItems()[0].quantity).toBe(2);
    await user.click(screen.getByRole('button', { name: 'tobias' }));
    expect(readItems()).toHaveLength(2);
  });

  it('el stock se comparte entre lineas y actualizar o eliminar afecta solo la indicada', async () => {
    const user = userEvent.setup();
    render(<CartProvider><CartHarness /></CartProvider>);
    await user.click(screen.getByRole('button', { name: 'Tobias' }));
    await user.click(screen.getByRole('button', { name: 'Matías' }));
    await user.click(screen.getByRole('button', { name: 'Actualizar primera' }));
    expect(readItems().map((item) => item.quantity)).toEqual([2, 1]);
    await user.click(screen.getByRole('button', { name: 'tobias' }));
    expect(readItems()).toHaveLength(2);
    expect(screen.getByTestId('summary')).toHaveTextContent('3|3300');
    await user.click(screen.getByRole('button', { name: 'Eliminar segunda' }));
    expect(readItems()).toHaveLength(1);
    expect(readItems()[0].personalizations[0].customerNote).toBe('Tobias');
  });

  it('recupera carritos antiguos, crea cartLineId y conserva localStorage', async () => {
    localStorage.setItem('tierra-mate-cart', JSON.stringify([
      { ...baseItem, personalizations: engraving('Tobias') },
      { ...baseItem, personalizations: engraving('Matías') },
    ]));
    render(<CartProvider><CartHarness /></CartProvider>);
    expect(readItems()).toHaveLength(2);
    expect(readItems().every((item) => item.cartLineId)).toBe(true);
    await waitFor(() => expect(JSON.parse(localStorage.getItem('tierra-mate-cart')).every((item) => item.cartLineId)).toBe(true));
  });

  it('normaliza y combina una misma variante sin personalizaciones', () => {
    const normalized = normalizeCart([baseItem, { ...baseItem, quantity: 2 }]);
    expect(normalized).toHaveLength(1);
    expect(normalized[0].quantity).toBe(3);
  });
});
