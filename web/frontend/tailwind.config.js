export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#E8553A',
          light: '#FEF0ED',
          hover: '#D44428',
          muted: '#E8553A20',
        },
        surface: {
          DEFAULT: '#FAFAF8',
          warm: '#F5F4F0',
          card: '#FFFFFF',
          hover: '#EFEDE8',
        },
        ink: {
          DEFAULT: '#1A1A1A',
          secondary: '#6B6B6B',
          muted: '#9E9E9E',
          faint: '#C8C8C8',
        },
        border: {
          DEFAULT: '#E5E3DE',
          light: '#F0EEE9',
        },
        wechat: '#07C160',
        zhihu: '#0066FF',
        bilibili: '#FB7299',
        xiaohongshu: '#FF2442',
        sidebar: {
          DEFAULT: '#1A1A1A',
          hover: '#2A2A2A',
          active: '#333333',
        },
      },
      fontFamily: {
        display: ['"Sora"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.06)',
        subtle: '0 1px 0 rgba(0,0,0,0.03)',
        elevated: '0 12px 40px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        '2xl': '12px',
        'xl': '8px',
        'lg': '6px',
      },
    },
  },
  plugins: [],
};
