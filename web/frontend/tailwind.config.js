export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        px: {
          bg: '#0A0A0A',
          surface: '#111111',
          card: '#161616',
          hover: '#1C1C1C',
          border: '#252525',
          'border-subtle': '#1A1A1A',
        },
        tx: {
          DEFAULT: '#E8E8E8',
          dim: '#888888',
          mute: '#555555',
          faint: '#333333',
        },
        dot: {
          red: '#FF3B30',
          'red-dim': '#FF3B3018',
        },
        wechat: '#07C160',
        zhihu: '#0066FF',
        bilibili: '#FB7299',
        xiaohongshu: '#FF2442',
      },
      fontFamily: {
        mono: ['"Space Mono"', 'monospace'],
        sans: ['"Manrope"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        none: '0px',
        sm: '2px',
      },
      letterSpacing: {
        pixel: '0.15em',
        wide: '0.08em',
      },
    },
  },
  plugins: [],
};
