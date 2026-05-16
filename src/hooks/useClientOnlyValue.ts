export function useClientOnlyValue<S, C>(_server: S, client: C): C {
  return client;
}
