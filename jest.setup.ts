import '@testing-library/react-native';

// react-native-reanimated v4 mock: /mock entry pulls react-native-worklets (native) which crashes Jest.
// Manual stub covers everything PrimaryButton (and other components) need.
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      Text: ReactNative.Text,
      Image: ReactNative.Image,
      ScrollView: ReactNative.ScrollView,
      createAnimatedComponent: (Component: unknown) => Component,
    },
    View: ReactNative.View,
    Text: ReactNative.Text,
    Image: ReactNative.Image,
    ScrollView: ReactNative.ScrollView,
    createAnimatedComponent: (Component: unknown) => Component,
    useAnimatedStyle: () => ({}),
    useSharedValue: (initial: unknown) => ({ value: initial }),
    withSpring: (val: unknown) => val,
    withTiming: (val: unknown) => val,
    withDelay: (_delay: unknown, val: unknown) => val,
    withRepeat: (val: unknown) => val,
    withSequence: (...vals: unknown[]) => vals[vals.length - 1],
    useReducedMotion: () => false,
    interpolate: (_v: unknown, _i: unknown, o: unknown[]) => o[0],
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    runOnJS: (fn: unknown) => fn,
    runOnUI: (fn: unknown) => fn,
  };
});
