import { getHeaderTitle } from '@react-navigation/elements';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { SCREEN_HORIZONTAL_PADDING, WEB_MAX_CONTENT_WIDTH } from '@/constants/Layout';

import type { AppColorScheme } from '@/navigation/theme';

const BAR_HEIGHT = Platform.select({ ios: 44, android: 56, default: 56 }) ?? 56;

function statusBarBackground(scheme: AppColorScheme): string {
  return scheme === 'dark' ? '#000000' : '#f2f2f7';
}

function headerBorderColor(scheme: AppColorScheme): string {
  return scheme === 'dark' ? '#ffffff' : 'rgba(255, 255, 255, 0.9)';
}

function borderLineHeight(): number {
  return Platform.OS === 'android' ? 1 : StyleSheet.hairlineWidth;
}

type AppStackHeaderViewProps = NativeStackHeaderProps & {
  scheme: AppColorScheme;
};

function AppStackHeaderView({ options, route, navigation, scheme, back }: AppStackHeaderViewProps) {
  const insets = useSafeAreaInsets();
  const palette = Colors[scheme];
  const headerBg = palette.headerBar;
  const borderColor = headerBorderColor(scheme);
  const lineHeight = borderLineHeight();
  const title = getHeaderTitle(options, route.name);
  const tintColor = (options.headerTintColor ?? palette.text) as string;
  const canGoBack = navigation.canGoBack();
  const titleAlign = options.headerTitleAlign ?? 'left';

  const headerLeft = options.headerLeft?.({
    canGoBack,
    tintColor,
    label: options.headerBackTitle,
    href: back?.href,
  });

  const headerRight = options.headerRight?.({
    canGoBack,
    tintColor,
  });

  const titleNode =
    typeof options.headerTitle === 'function' ? (
      options.headerTitle({ children: title, tintColor })
    ) : (
      <Text
        style={[styles.title, { color: tintColor }, options.headerTitleStyle]}
        numberOfLines={1}
        accessibilityRole="header">
        {typeof options.headerTitle === 'string' ? options.headerTitle : title}
      </Text>
    );

  return (
    <View style={[styles.root, Platform.OS === 'web' && styles.webRoot]}>
      {insets.top > 0 ? (
        <View style={{ height: insets.top, backgroundColor: statusBarBackground(scheme) }} />
      ) : null}
      <View style={[styles.bar, { height: BAR_HEIGHT, backgroundColor: headerBg }]}>
        <View
          pointerEvents="none"
          style={[styles.edgeH, { top: 0, height: lineHeight, backgroundColor: borderColor }]}
        />
        <View
          pointerEvents="none"
          style={[styles.edgeH, { bottom: 0, height: lineHeight, backgroundColor: borderColor }]}
        />
        <View
          pointerEvents="none"
          style={[styles.edgeV, { left: 0, width: lineHeight, backgroundColor: borderColor }]}
        />
        <View
          pointerEvents="none"
          style={[styles.edgeV, { right: 0, width: lineHeight, backgroundColor: borderColor }]}
        />
        <View style={[styles.row, { paddingHorizontal: SCREEN_HORIZONTAL_PADDING }]}>
          {headerLeft ? <View style={styles.slotLeft}>{headerLeft}</View> : null}
          <View
            style={[
              styles.titleWrap,
              titleAlign === 'center' ? styles.titleCenter : styles.titleLeft,
            ]}>
            {titleNode}
          </View>
          {headerRight ? <View style={styles.slotRight}>{headerRight}</View> : null}
        </View>
      </View>
    </View>
  );
}

/** Custom stack header — borders render on web and in Expo Go (native-stack ignores `headerBackground`). */
export function appStackHeaderForScheme(scheme: AppColorScheme) {
  return function AppStackHeader(props: NativeStackHeaderProps) {
    return <AppStackHeaderView {...props} scheme={scheme} />;
  };
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  webRoot: {
    maxWidth: WEB_MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  bar: {
    width: '100%',
    justifyContent: 'center',
  },
  edgeH: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  edgeV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: BAR_HEIGHT,
    gap: 8,
  },
  slotLeft: {
    flexShrink: 0,
  },
  slotRight: {
    flexShrink: 0,
    marginLeft: 'auto',
  },
  titleWrap: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  titleCenter: {
    alignItems: 'center',
  },
  titleLeft: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
});
