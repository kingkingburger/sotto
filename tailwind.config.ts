import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'system-ui', 'sans-serif'],
      },
      colors: {
        sotto: {
          50: '#faf8f5',
          100: '#f3efe8',
          200: '#e8e0d4',
          300: '#d4c4ac',
          400: '#9e7e5a',
          500: '#8b7355',
          600: '#6d5a43',
          700: '#544433',
          800: '#3d3226',
          900: '#2d2418',
        },
        tag: {
          budget: '#4ade80',
          taste: '#f97316',
          volume: '#3b82f6',
          easy: '#a78bfa',
          nutrition: '#14b8a6',
        },
        accent: {
          50: '#FDF5F2',
          400: '#D4907A',
          500: '#C4785A',
          600: '#A8624A',
        },
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease-out forwards',
        slideUp: 'slideUp 0.5s ease-out forwards',
        scaleIn: 'scaleIn 0.3s ease-out forwards',
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        slideInRight: 'slideInRight 0.4s ease-out forwards',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(45 36 24 / 0.06), 0 1px 2px -1px rgb(45 36 24 / 0.06)',
        'card-hover': '0 4px 12px 0 rgb(45 36 24 / 0.1), 0 2px 4px -2px rgb(45 36 24 / 0.06)',
        'elevated': '0 8px 24px 0 rgb(45 36 24 / 0.12), 0 4px 8px -4px rgb(45 36 24 / 0.08)',
        'accent-glow': '0 4px 14px 0 rgb(196 120 90 / 0.2)',
      },
    },
  },
  plugins: [],
};

export default config;
