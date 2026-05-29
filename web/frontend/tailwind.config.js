export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        px: {
          bg: '#FAFAF9',
          surface: '#F2F2F0',
          card: '#FFFFFF',
          hover: '#EBEBE9',
          border: '#E2E2E0',
          'border-subtle': '#EAEAE8',
        },
        tx: {
          DEFAULT: '#1A1A1A',
          dim: '#6B6B6B',
          mute: '#999999',
          faint: '#C8C8C6',
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
        mono: ['"Space Mono"', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
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
