import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export type MeubolsoWordmarkProps = {
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
  /**
   * `standalone`: login / hero — leitores de tela anunciam "MeuBolso" uma vez.
   * `inline`: dentro de um título com rótulo pai — não compete com o label agregado.
   */
  variant?: 'standalone' | 'inline';
};

/**
 * Marca "Meu" + "Bolso" com o mesmo tratamento tipográfico da tela de entrar (sign-in).
 * Cores: "Meu" segue o texto do tema; "Bolso" usa o azul da marca (`Colors.light.tint`).
 */
export function MeubolsoWordmark({
  fontSize = 36,
  style,
  variant = 'standalone',
}: MeubolsoWordmarkProps) {
  const scheme = useColorScheme() ?? 'light';
  const meuColor = Colors[scheme].text;
  const bolsoColor = Colors.light.tint;
  const isDark = scheme === 'dark';
  const scale = fontSize / 36;

  const suppressPartLabels = variant === 'standalone' || variant === 'inline';

  const meuStyle = [
    styles.meu,
    {
      fontSize,
      letterSpacing: 2 * scale,
      color: meuColor,
    },
    isDark ? styles.shadowMeuDark : null,
  ];

  const bolsoStyle = [
    styles.bolso,
    {
      fontSize,
      letterSpacing: 1 * scale,
      color: bolsoColor,
    },
    isDark ? styles.shadowBolsoDark : styles.shadowBolsoLight,
  ];

  return (
    <View
      style={[styles.row, style]}
      accessible={variant === 'standalone'}
      accessibilityRole={variant === 'standalone' ? 'text' : undefined}
      accessibilityLabel={variant === 'standalone' ? 'MeuBolso' : undefined}>
      <Text style={meuStyle} importantForAccessibility={suppressPartLabels ? 'no' : 'yes'}>
        Meu
      </Text>
      <Text style={bolsoStyle} importantForAccessibility={suppressPartLabels ? 'no' : 'yes'}>
        Bolso
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  meu: {
    fontWeight: '200',
  },
  bolso: {
    fontWeight: '800',
  },
  shadowMeuDark: {
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  shadowBolsoDark: {
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  shadowBolsoLight: {
    textShadowColor: 'rgba(47,149,220,0.22)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
