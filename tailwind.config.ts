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
          400: '#b9a07e',
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
      },
    },
  },
  plugins: [],
};

export default config;
