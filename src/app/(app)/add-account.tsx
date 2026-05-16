import { Redirect } from 'expo-router';

/** @deprecated Use `/(app)/contas`; mantido para links antigos. */
export default function AddAccountRedirect() {
  return <Redirect href="/(app)/contas" />;
}
