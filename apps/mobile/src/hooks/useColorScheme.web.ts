// Web: o template Expo força `light` para evitar hydration mismatch com media queries.
// Este produto usa UI escura alinhada ao mobile — tema único `dark` no browser.
export function useColorScheme() {
  return 'dark';
}
