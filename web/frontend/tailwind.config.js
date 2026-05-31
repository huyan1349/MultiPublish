export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        px: {
          bg: '#F7F7F5',
          surface: '#EFEFED',
          card: '#FFFFFF',
          hover: '#E8E8E6',
          border: '#E5E5E3',
          'border-subtle': '#EAEAE8',
        },
        tx: {
          DEFAULT: '#1A1A1A',
          dim: '#888888',
          mute: '#AAAAAA',
          faint: '#C0C0BE',
        },
        dot: {
          red: '#FF3B30',
          'red-dim': '#FF3B3012',
        },
        wechat: '#07C160',
        zhihu: '#0066FF',
        bilibili: '#FB7299',
        xiaohongshu: '#FF2442',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        none: '0px',
        sm: '2px',
      },
      letterSpacing: {
        pixel: '0.16em',
        wide: '0.08em',
      },
    },
  },
  plugins: [],
};
