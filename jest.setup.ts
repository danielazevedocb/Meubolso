import '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  // Jest manual mock factory runs before ESM imports resolve.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Reanimated = require('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useReducedMotion: () => false,
  };
});
