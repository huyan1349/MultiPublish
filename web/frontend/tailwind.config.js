export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        px: {
          bg: '#F5F5F3',
          surface: '#ECECEA',
          card: '#FFFFFF',
          hover: '#E5E5E3',
          border: '#E0E0DE',
          'border-subtle': '#EAEAE8',
          'border-strong': '#CCCCCC',
        },
        tx: {
          DEFAULT: '#1A1A1A',
          dim: '#777777',
          mute: '#AAAAAA',
          faint: '#CCCCCC',
        },
        dot: {
          red: '#FF3B30',
          'red-soft': '#FF3B3014',
        },
        wechat: '#07C160',
        zhihu: '#0066FF',
        bilibili: '#FB7299',
        xiaohongshu: '#FF2442',
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
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
