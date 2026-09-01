import { z } from 'zod';

const whatsapp = z.string().trim().min(6).max(40).transform((value, context) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    context.addIssue({ code: 'custom', message: 'El numero debe tener entre 8 y 15 digitos' });
    return z.NEVER;
  }
  return digits;
});

export const storeSettingsUpdateBody = z.object({
  store_name: z.string().trim().min(1).max(120).optional(),
  whatsapp_number: whatsapp.optional(),
  reservation_minutes: z.coerce.number().int().min(1).max(1440).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'Debe enviar al menos un campo' });
