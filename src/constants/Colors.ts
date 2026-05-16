const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    surfaceSubtle: '#f5f5f7',
    /** Opaque navigation bar — no alpha; distinct from scrollable cards. */
    headerBar: '#ebebed',
    borderSubtle: 'rgba(0,0,0,0.08)',
    balancePositive: '#1b5e20',
    balanceNegative: '#b71c1c',
    caption: 'rgba(0,0,0,0.55)',
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
    surfaceSubtle: '#2c2c2e',
    /** Opaque navigation bar — distinct from #000 screen background (no alpha). */
    headerBar: '#2c2c2e',
    borderSubtle: 'rgba(255,255,255,0.12)',
    balancePositive: '#81c784',
    balanceNegative: '#ef9a9a',
    caption: 'rgba(255,255,255,0.55)',
  },
};
