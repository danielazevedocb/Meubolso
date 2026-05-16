import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  findNodeHandle,
  Keyboard,
  Platform,
  ScrollView,
  type TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_EXTRA_ABOVE_KEYBOARD = 80;
const DEFAULT_MIN_BOTTOM_PAD = 28;

export type UseKeyboardScrollPaddingOptions = {
  /** Space between focused field bottom and keyboard top. */
  extraOffset?: number;
  /** Minimum bottom padding when keyboard is hidden (before safe area). */
  minBottomPad?: number;
};

/**
 * Tracks keyboard height and exposes scroll helpers so focused inputs stay visible.
 * Works on iOS and Android (including edge-to-edge + `softwareKeyboardLayoutMode: resize`).
 */
export function useKeyboardScrollPadding(options: UseKeyboardScrollPaddingOptions = {}) {
  const {
    extraOffset = DEFAULT_EXTRA_ABOVE_KEYBOARD,
    minBottomPad = DEFAULT_MIN_BOTTOM_PAD,
  } = options;

  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const pendingEndScroll = useRef(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: { endCoordinates: { height: number } }) => {
      setKeyboardHeight(e.endCoordinates.height);
      if (pendingEndScroll.current) {
        pendingEndScroll.current = false;
        requestAnimationFrame(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        });
      }
    };
    const onHide = () => setKeyboardHeight(0);

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const contentPaddingBottom = useMemo(
    () => Math.max(insets.bottom, minBottomPad) + keyboardHeight,
    [insets.bottom, keyboardHeight, minBottomPad],
  );

  const scrollToEnd = useCallback(
    (animated = true) => {
      scrollRef.current?.scrollToEnd({ animated });
    },
    [],
  );

  const scrollInputIntoView = useCallback(
    (inputRef: React.RefObject<TextInput | null>) => {
      const scroll = scrollRef.current;
      const input = inputRef.current;

      const runScroll = () => {
        if (!scroll) return;

        if (input) {
          const handle = findNodeHandle(input);
          if (handle != null) {
            scroll.scrollResponderScrollNativeHandleToKeyboard(handle, extraOffset, true);
            return;
          }

          input.measureInWindow((_x, y, _w, h) => {
            const windowH = Dimensions.get('window').height;
            const kb = keyboardHeight || 0;
            if (kb <= 0) {
              scroll.scrollToEnd({ animated: true });
              return;
            }
            const keyboardTop = windowH - kb;
            const inputBottom = y + h;
            const overlap = inputBottom + extraOffset - keyboardTop;
            if (overlap > 0) {
              scroll.scrollToEnd({ animated: true });
            }
          });
          return;
        }

        scroll.scrollToEnd({ animated: true });
      };

      if (Platform.OS === 'android' && keyboardHeight === 0) {
        pendingEndScroll.current = true;
      }

      requestAnimationFrame(runScroll);
      setTimeout(runScroll, Platform.OS === 'ios' ? 280 : 120);
      if (Platform.OS === 'ios') {
        setTimeout(runScroll, 400);
      }
    },
    [extraOffset, keyboardHeight],
  );

  /** Scroll footer / bottom fields into view (salary, password, etc.). */
  const scrollToEndOnFocus = useCallback(() => {
    if (Platform.OS === 'android' && keyboardHeight === 0) {
      pendingEndScroll.current = true;
    }
    requestAnimationFrame(() => scrollToEnd(true));
    setTimeout(() => scrollToEnd(true), 120);
    if (Platform.OS === 'ios') {
      setTimeout(() => scrollToEnd(true), 280);
    }
  }, [keyboardHeight, scrollToEnd]);

  const createFocusHandler = useCallback(
    (inputRef: React.RefObject<TextInput | null>) => () => {
      scrollInputIntoView(inputRef);
    },
    [scrollInputIntoView],
  );

  return {
    scrollRef,
    keyboardHeight,
    contentPaddingBottom,
    scrollInputIntoView,
    scrollToEndOnFocus,
    createFocusHandler,
  };
}
