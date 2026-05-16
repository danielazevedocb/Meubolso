import { z } from 'zod';

/** Parse Brazilian-style decimal input (e.g. "1.234,56" or "380,5"). */
export function parseMoneyInput(raw: string): number {
  const t = raw.trim();
  if (!t) return NaN;
  const normalized = t.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

export const billFormSchema = z
  .object({
    company: z
      .string()
      .trim()
      .min(1, 'Informe a empresa ou descrição.')
      .max(200, 'Máximo de 200 caracteres.'),
    amountInput: z.string().trim().min(1, 'Informe o valor.'),
    paid: z.boolean(),
    due_date: z.string().max(40, 'Vencimento muito longo.'),
    note: z.string().max(500, 'Nota muito longa.'),
    assigneeUserId: z.string().uuid('Selecione o membro.'),
  })
  .superRefine((data, ctx) => {
    const amount = parseMoneyInput(data.amountInput);
    if (!Number.isFinite(amount) || amount < 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['amountInput'],
        message: 'Valor inválido. Use números (ex.: 380,50).',
      });
    }
  });

export type BillFormValues = z.infer<typeof billFormSchema>;
