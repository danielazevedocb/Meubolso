import { z } from 'zod';

export const profileDisplayNameSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Use pelo menos 2 caracteres no nome.')
    .max(80, 'Nome longo demais.'),
});

export type ProfileDisplayNameValues = z.infer<typeof profileDisplayNameSchema>;

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: z
      .string()
      .min(8, 'A nova senha precisa ter pelo menos 8 caracteres.')
      .max(72, 'Senha longa demais.'),
    confirmNewPassword: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'As novas senhas não coincidem.',
    path: ['confirmNewPassword'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;
