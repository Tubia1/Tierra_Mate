import { AppError } from '../helpers/AppError.js';
import * as defaultRepository from '../repositories/orderRepository.js';

const MONEY_SCALE = 100;

function moneyToCents(value) {
  const normalized = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new AppError('Precio invalido en base de datos', 500, 'INVALID_STORED_PRICE');
  }
  const [whole, decimals = ''] = normalized.split('.');
  return (Number(whole) * MONEY_SCALE) + Number(decimals.padEnd(2, '0'));
}

function centsToDecimal(cents) {
  return (cents / MONEY_SCALE).toFixed(2);
}

function formatMoney(cents, currency) {
  return `${currency} ${centsToDecimal(cents)}`;
}

function mapById(rows, key = 'id') {
  return new Map(rows.map((row) => [Number(row[key]), row]));
}

function normalizeChoices(choices) {
  if (!choices) return [];
  return typeof choices === 'string' ? JSON.parse(choices) : choices;
}

function assertNoDuplicateVariants(items) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.variant_id)) {
      throw new AppError('No se permiten variantes repetidas en el pedido', 400, 'DUPLICATE_VARIANT');
    }
    seen.add(item.variant_id);
  }
}

function assertNoDuplicatePersonalizations(personalizations) {
  const seen = new Set();
  for (const personalization of personalizations) {
    if (seen.has(personalization.option_id)) {
      throw new AppError('No se permiten personalizaciones repetidas en un item', 400, 'DUPLICATE_PERSONALIZATION');
    }
    seen.add(personalization.option_id);
  }
}

function validateSelectedPersonalization(input, option) {
  const selectedValue = input.selected_value?.trim();
  const customerNote = input.customer_note?.trim();
  if (!selectedValue && !customerNote) {
    throw new AppError('La personalizacion necesita un valor o una nota', 400, 'INVALID_PERSONALIZATION');
  }

  if (customerNote && !option.allows_note) {
    throw new AppError('La personalizacion no admite nota', 400, 'INVALID_PERSONALIZATION_NOTE');
  }

  if (option.input_type === 'select') {
    const choices = normalizeChoices(option.choices);
    if (!selectedValue || !choices.some((choice) => choice.value === selectedValue)) {
      throw new AppError('La opcion seleccionada no es valida', 400, 'INVALID_PERSONALIZATION_CHOICE');
    }
  }

  if (option.input_type === 'boolean' && selectedValue && !['true', 'false'].includes(selectedValue)) {
    throw new AppError('La personalizacion booleana debe ser true o false', 400, 'INVALID_PERSONALIZATION');
  }
}

function buildWhatsappMessage({ order, items, currency }) {
  const lines = [
    `Pedido ${order.code}`,
    `Cliente: ${order.customer_name}`,
    `Telefono: ${order.customer_phone}`,
    `Localidad: ${order.customer_locality}`,
    `Direccion: ${order.customer_address}`,
    '',
    'Productos:',
  ];

  for (const item of items) {
    const itemTotalCents = moneyToCents(item.line_total);
    lines.push(`- ${item.quantity} x ${item.product_name} / ${item.variant_name} (${item.sku}) - ${formatMoney(itemTotalCents, currency)}`);
    for (const personalization of item.personalizations) {
      const value = personalization.selected_value ? `: ${personalization.selected_value}` : '';
      const note = personalization.customer_note ? ` - Nota: ${personalization.customer_note}` : '';
      lines.push(`  * ${personalization.option_name}${value}${note}`);
    }
  }

  if (order.customer_notes) {
    lines.push('', `Notas: ${order.customer_notes}`);
  }

  lines.push('', `Total: ${formatMoney(moneyToCents(order.total), currency)}`);
  lines.push(`Reserva vigente hasta: ${new Date(order.reserved_until).toISOString()}`);
  return lines.join('\n');
}

function buildWhatsappUrl(number, message) {
  const normalizedNumber = String(number ?? '').replace(/\D/g, '');
  if (!normalizedNumber) return null;
  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
}

export function createOrderService(repository = defaultRepository) {
  return {
    list: (filters) => repository.list(filters),
    expire: async () => {
      const orders = await repository.transaction((client) => repository.expireReservations(client));
      return { expired_count: orders.length, orders };
    },
    cancel: async (id, { reason } = {}) => {
      const result = await repository.transaction(async (client) => {
        const order = await repository.lockOrder(client, id);
        if (!order) throw new AppError('Pedido no encontrado', 404, 'ORDER_NOT_FOUND');

        if (order.status === 'cancelled') return { outcome: 'cancelled', order };

        if (order.status !== 'reserved') {
          throw new AppError('El pedido no se puede cancelar en su estado actual', 409, 'INVALID_ORDER_STATUS');
        }

        if (order.reservation_expired) {
          const expiredOrder = await repository.markOrderExpired(client, id);
          return { outcome: 'expired', order: expiredOrder };
        }

        return {
          outcome: 'cancelled',
          order: await repository.cancelOrder(client, id, reason ?? null),
        };
      });

      if (result.outcome === 'expired') {
        throw new AppError('La reserva ya vencio', 409, 'RESERVATION_EXPIRED', {
          order: result.order,
        });
      }
      return result.order;
    },
    getById: async (id) => {
      const order = await repository.findById(id);
      if (!order) throw new AppError('Pedido no encontrado', 404, 'ORDER_NOT_FOUND');
      return order;
    },
    create: async (data) => {
      assertNoDuplicateVariants(data.items);

      return repository.transaction(async (client) => {
        const settings = await repository.getStoreSettings(client);
        const variantIds = [...data.items].map((item) => item.variant_id).sort((a, b) => a - b);
        const variants = await repository.lockVariants(client, variantIds);
        const variantsById = mapById(variants, 'variant_id');

        if (variants.length !== variantIds.length) {
          throw new AppError('Una o mas variantes no existen o no estan activas', 400, 'INVALID_VARIANT');
        }

        const reservedRows = await repository.getReservedQuantities(client, variantIds);
        const reservedByVariant = new Map(
          reservedRows.map((row) => [Number(row.variant_id), Number(row.reserved_quantity)]),
        );

        const productIds = [...new Set(variants.map((variant) => Number(variant.product_id)))].sort((a, b) => a - b);
        const options = await repository.getPersonalizationOptions(client, productIds);
        const optionsById = mapById(options);
        const requiredOptionsByProduct = new Map();
        for (const option of options) {
          if (!option.required) continue;
          const productId = Number(option.product_id);
          requiredOptionsByProduct.set(productId, [...(requiredOptionsByProduct.get(productId) ?? []), option]);
        }

        const preparedItems = [];
        let subtotalCents = 0;

        for (const item of data.items) {
          assertNoDuplicatePersonalizations(item.personalizations);
          const variant = variantsById.get(item.variant_id);
          const reservedQuantity = reservedByVariant.get(item.variant_id) ?? 0;
          const available = Number(variant.stock_quantity) - reservedQuantity;
          if (available < item.quantity) {
            throw new AppError('Stock insuficiente para una variante del pedido', 409, 'INSUFFICIENT_STOCK', {
              variant_id: item.variant_id,
              available,
              requested: item.quantity,
            });
          }

          const selectedOptionIds = new Set(item.personalizations.map((entry) => entry.option_id));
          for (const requiredOption of requiredOptionsByProduct.get(Number(variant.product_id)) ?? []) {
            if (!selectedOptionIds.has(Number(requiredOption.id))) {
              throw new AppError('Falta una personalizacion obligatoria', 400, 'REQUIRED_PERSONALIZATION_MISSING', {
                option_id: Number(requiredOption.id),
              });
            }
          }

          const unitPriceCents = moneyToCents(variant.price);
          let personalizationTotalCents = 0;
          const personalizations = [];

          for (const personalization of item.personalizations) {
            const option = optionsById.get(personalization.option_id);
            if (!option || Number(option.product_id) !== Number(variant.product_id)) {
              throw new AppError('Personalizacion invalida para el producto', 400, 'INVALID_PERSONALIZATION');
            }
            validateSelectedPersonalization(personalization, option);
            const extraPriceCents = moneyToCents(option.extra_price);
            personalizationTotalCents += extraPriceCents * item.quantity;
            personalizations.push({
              option_id: option.id,
              option_name: option.name,
              selected_value: personalization.selected_value ?? null,
              customer_note: personalization.customer_note ?? null,
              extra_price: centsToDecimal(extraPriceCents),
            });
          }

          const lineTotalCents = (unitPriceCents * item.quantity) + personalizationTotalCents;
          subtotalCents += lineTotalCents;
          preparedItems.push({
            product_id: variant.product_id,
            variant_id: variant.variant_id,
            product_name: variant.product_name,
            variant_name: variant.variant_name,
            sku: variant.sku,
            unit_price: centsToDecimal(unitPriceCents),
            quantity: item.quantity,
            personalization_total: centsToDecimal(personalizationTotalCents),
            line_total: centsToDecimal(lineTotalCents),
            personalizations,
          });
        }

        const subtotal = centsToDecimal(subtotalCents);
        const order = await repository.createOrder(client, {
          customer: data.customer,
          subtotal,
          total: subtotal,
          reservationMinutes: Number(settings.reservation_minutes),
        });

        const storedItems = [];
        for (const item of preparedItems) {
          const storedItem = await repository.createOrderItem(client, order.id, item);
          const storedPersonalizations = [];
          for (const personalization of item.personalizations) {
            storedPersonalizations.push(
              await repository.createOrderItemPersonalization(client, storedItem.id, personalization),
            );
          }
          storedItems.push({ ...storedItem, personalizations: storedPersonalizations });
        }

        const orderWithItems = { ...order, items: storedItems };
        const message = buildWhatsappMessage({
          order: orderWithItems,
          items: storedItems,
          currency: settings.currency,
        });

        return {
          order: orderWithItems,
          message,
          whatsapp_url: buildWhatsappUrl(settings.whatsapp_number, message),
        };
      });
    },
  };
}

export const orderService = createOrderService();
