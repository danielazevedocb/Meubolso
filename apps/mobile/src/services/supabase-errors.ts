import type { AuthError, PostgrestError } from '@supabase/supabase-js';

/** User-facing copy for common Supabase Auth errors (PT-BR). */
export function mapAuthError(error: AuthError | null | undefined): string {
  if (!error?.message) return 'Não foi possível concluir o acesso. Tente novamente.';
  const msg = error.message.toLowerCase();
  if (msg.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (msg.includes('user already registered')) return 'Este e-mail já está cadastrado. Entre na conta ou use outro e-mail.';
  if (msg.includes('password')) return 'Senha não atende aos requisitos. Use ao menos 8 caracteres.';
  return error.message;
}

/** Map PostgREST / RPC errors to friendly PT-BR strings. */
export function mapPostgrestOrRpcError(
  error: PostgrestError | Error | null | undefined,
): string {
  const raw = error?.message ?? '';
  if (!raw) return 'Algo deu errado. Verifique a conexão e tente novamente.';

  if (raw.includes('Group reached max member limit')) {
    return 'Este grupo já está com o máximo de 6 membros. Peça para alguém sair ou use outro código.';
  }

  if (
    raw.includes('Invalid or unknown invite code') ||
    raw.includes('invite code') && raw.toLowerCase().includes('invalid')
  ) {
    return 'Código de convite inválido ou não encontrado. Confira e tente outra vez.';
  }

  if (raw.includes('Authentication required')) {
    return 'Sua sessão expirou. Entre novamente.';
  }

  if (
    raw.includes('duplicate key value') ||
    raw.includes('groups_invite_code_uidx') ||
    raw.toLowerCase().includes('unique constraint')
  ) {
    if (
      raw.includes('bills_group_company_uidx') ||
      raw.includes('bills_solo_company_uidx')
    ) {
      return 'Já existe uma conta com essa descrição neste mês. Ajuste o nome ou edite a existente.';
    }
    return 'Código de convite já em uso. Toque em criar de novo para gerar outro.';
  }

  if (
    raw.toLowerCase().includes('permission denied') ||
    raw.includes('42501') ||
    raw.toLowerCase().includes('new row violates row-level security')
  ) {
    return 'Não foi possível salvar: permissão negada pelo servidor. Talvez você não possa editar este registro.';
  }

  return raw;
}
