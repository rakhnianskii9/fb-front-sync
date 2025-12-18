import { createTheme } from '@mui/material/styles';

type PaletteMode = 'light' | 'dark';

// Helper to convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export const createAppTheme = (mode: PaletteMode) => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: hslToHex(210, 100, 56), // #1c9bef
      },
      secondary: {
        main: isDark ? hslToHex(222, 14, 28) : hslToHex(220, 14, 84),
      },
      error: {
        main: hslToHex(0, 84, 60), // destructive
      },
      background: {
        default: isDark ? hslToHex(222, 14, 12) : hslToHex(0, 0, 100),
        paper: isDark ? hslToHex(222, 14, 16) : hslToHex(220, 14, 96),
      },
      text: {
        primary: isDark ? hslToHex(0, 0, 98) : hslToHex(222, 14, 12),
        secondary: isDark ? hslToHex(220, 9, 65) : hslToHex(220, 9, 35),
      },
      divider: isDark ? hslToHex(222, 14, 24) : hslToHex(220, 14, 88),
    },
    typography: {
      fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 700,
    },
    shape: {
      borderRadius: 8, // 0.5rem
    },
    shadows: isDark
      ? [
          'none',
          '0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
          '0px 1px 3px 0px rgba(0, 0, 0, 0.40)',
          '0px 2px 4px -1px rgba(0, 0, 0, 0.35), 0px 1px 2px -1px rgba(0, 0, 0, 0.40)',
          '0px 4px 6px -1px rgba(0, 0, 0, 0.40), 0px 2px 4px -2px rgba(0, 0, 0, 0.40)',
          '0px 6px 16px -6px rgba(0, 0, 0, 0.50), 0px 4px 8px -4px rgba(0, 0, 0, 0.45)',
          '0px 12px 24px -8px rgba(0, 0, 0, 0.60), 0px 8px 16px -6px rgba(0, 0, 0, 0.55)',
          '0px 20px 32px -12px rgba(0, 0, 0, 0.65), 0px 12px 24px -8px rgba(0, 0, 0, 0.60)',
          '0px 32px 48px -16px rgba(0, 0, 0, 0.70)',
          'none','none','none','none','none','none','none','none','none','none','none','none','none','none','none','none',
        ]
      : [
          'none',
          '0px 1px 2px 0px rgba(34, 37, 42, 0.05)',
          '0px 1px 3px 0px rgba(34, 37, 42, 0.10)',
          '0px 2px 4px -1px rgba(34, 37, 42, 0.06), 0px 1px 2px -1px rgba(34, 37, 42, 0.10)',
          '0px 4px 6px -1px rgba(34, 37, 42, 0.10), 0px 2px 4px -2px rgba(34, 37, 42, 0.10)',
          '0px 6px 16px -6px rgba(34, 37, 42, 0.16), 0px 4px 8px -4px rgba(34, 37, 42, 0.12)',
          '0px 12px 24px -8px rgba(34, 37, 42, 0.20), 0px 8px 16px -6px rgba(34, 37, 42, 0.16)',
          '0px 20px 32px -12px rgba(34, 37, 42, 0.24), 0px 12px 24px -8px rgba(34, 37, 42, 0.20)',
          '0px 32px 48px -16px rgba(34, 37, 42, 0.30)',
          'none','none','none','none','none','none','none','none','none','none','none','none','none','none','none','none',
        ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: isDark ? '#444 #222' : '#ccc #f5f5f5',
            '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
              width: 8,
              height: 8,
            },
            '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
              borderRadius: 8,
              backgroundColor: isDark ? '#444' : '#ccc',
            },
            '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
              backgroundColor: isDark ? '#222' : '#f5f5f5',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
    },
  });
};
