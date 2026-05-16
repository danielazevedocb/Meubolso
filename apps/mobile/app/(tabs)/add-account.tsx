import { Redirect } from 'expo-router';

/** @deprecated Use `/(tabs)/contas`; mantido para links antigos. */
export default function AddAccountLegacyRedirect() {
  return <Redirect href="/(tabs)/contas" />;
}
