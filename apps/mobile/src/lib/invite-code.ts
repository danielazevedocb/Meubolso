const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomChar(): string {
  const i = Math.floor(Math.random() * ALPHABET.length);
  return ALPHABET[i]!;
}

/** Human-friendly invite code for `public.groups.invite_code` (trimmed, non-empty). */
export function generateInviteCode(length = 8): string {
  return Array.from({ length }, randomChar).join('');
}
