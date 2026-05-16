import { type ReactNode } from 'react';
import {
  Platform,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
} from 'react-native';

import {
  useKeyboardScrollPadding,
  type UseKeyboardScrollPaddingOptions,
} from '@/hooks/useKeyboardScrollPadding';

type Props = UseKeyboardScrollPaddingOptions &
  Omit<ScrollViewProps, 'contentContainerStyle'> & {
    children: ReactNode;
    contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  };

/**
 * ScrollView with keyboard height padding and shared focus-scroll behavior.
 */
export function KeyboardSafeScrollView({
  children,
  contentContainerStyle,
  style,
  extraOffset,
  minBottomPad,
  ...scrollProps
}: Props) {
  const { scrollRef, contentPaddingBottom } = useKeyboardScrollPadding({
    extraOffset,
    minBottomPad,
  });

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.flex, style]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: contentPaddingBottom },
        contentContainerStyle,
      ]}
      {...scrollProps}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
