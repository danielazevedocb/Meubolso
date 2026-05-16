import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail.').email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  displayName: z.string().trim().min(2, 'Use pelo menos 2 caracteres no nome.'),
  email: z.string().trim().min(1, 'Informe o e-mail.').email('Informe um e-mail válido.'),
  password: z
    .string()
    .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
    .max(72, 'Senha longa demais.'),
});

export type SignUpValues = z.infer<typeof signUpSchema>;

export const createGroupSchema = z.object({
  name: z.string().trim().min(2, 'Dê um nome com pelo menos 2 caracteres.').max(80, 'Nome longo demais.'),
});

export type CreateGroupValues = z.infer<typeof createGroupSchema>;

export const joinInviteSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4, 'Código incompleto.')
    .max(32, 'Código longo demais.'),
});

export type JoinInviteValues = z.infer<typeof joinInviteSchema>;
