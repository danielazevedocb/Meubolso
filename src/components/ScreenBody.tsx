import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

const WEB_MAX_WIDTH = 480;

type ScreenBodyProps = ViewProps & {
  fullWidth?: boolean;
};

export function ScreenBody({ style, fullWidth, children, ...rest }: ScreenBodyProps) {
  const constrained = Platform.OS === 'web' && !fullWidth;

  return (
    <View
      style={[styles.root, constrained && styles.webConstrained, style]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
  },
  webConstrained: {
    maxWidth: WEB_MAX_WIDTH,
    alignSelf: 'center',
  },
});
