/**
 * Links opcionais da tela Sobre.
 *
 * Defina no `.env` (apps/mobile), por exemplo:
 * EXPO_PUBLIC_PRIVACY_POLICY_URL=https://...
 * EXPO_PUBLIC_SUPPORT_URL=https://...
 * EXPO_PUBLIC_TERMS_URL=https://...
 *
 * Enquanto estiverem vazios, as linhas correspondentes não aparecem na UI.
 */
const privacyPolicyUrl =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() ??
  // TODO: definir URL pública da política de privacidade ou só via env acima
  '';

const supportUrl =
  process.env.EXPO_PUBLIC_SUPPORT_URL?.trim() ??
  // TODO: definir URL de suporte (FAQ, e-mail mailto:, formulário) ou só via env acima
  '';

const termsUrl =
  process.env.EXPO_PUBLIC_TERMS_URL?.trim() ??
  // TODO: definir URL dos termos de uso ou só via env acima
  '';

export const aboutLinks = {
  privacyPolicyUrl,
  supportUrl,
  termsUrl,
} as const;

export function isConfiguredExternalUrl(url: string): boolean {
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('mailto:')
  );
}
