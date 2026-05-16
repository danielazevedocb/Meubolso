import { supabase } from '@/lib/supabase';

/**
 * Atualiza `profiles.display_name` e espelha em `user.user_metadata.name`
 * (mesmo campo usado no cadastro em `sign-up.tsx`).
 */
export async function updateOwnProfileDisplayName(displayName: string): Promise<void> {
  const trimmed = displayName.trim();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user?.id) throw new Error('Sua sessão expirou. Entre novamente.');

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ display_name: trimmed })
    .eq('id', user.id);

  if (profileError) throw profileError;

  const { error: metaError } = await supabase.auth.updateUser({
    data: { name: trimmed },
  });
  if (metaError) throw metaError;
}

export async function updateOwnPassword(input: {
  email: string;
  newPassword: string;
  /** Se preenchida, reautentica antes de trocar a senha (recomendado se o servidor exigir). */
  currentPassword?: string;
}): Promise<void> {
  const current = input.currentPassword?.trim();
  if (current) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: input.email.trim(),
      password: current,
    });
    if (signInError) throw signInError;
  }

  const { error } = await supabase.auth.updateUser({ password: input.newPassword });
  if (error) throw error;
}
