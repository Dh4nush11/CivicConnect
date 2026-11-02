/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          50: '#f3f6fb',
          100: '#e5ecf5',
          200: '#c8d6e8',
          300: '#9bb4d2',
          400: '#6889b5',
          500: '#476a99',
          600: '#36557f',
          700: '#2a4365',
          800: '#1a2f4e',
          900: '#0b2545',
          950: '#06162b',
        },
        accent: {
          50: '#fff8ed',
          100: '#ffeed4',
          200: '#ffd8a7',
          300: '#ffba6d',
          400: '#ff9232',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        paper: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
        },
        status: {
          reported: '#1d4ed8',
          'in-progress': '#d97706',
          resolved: '#047857',
          rejected: '#b91c1c',
          duplicate: '#7c3aed',
        },
        category: {
          pothole: '#64748b',
          garbage: '#115e59',
          streetlight: '#a16207',
          water: '#0e7490',
          sewage: '#4c1d95',
          other: '#475569',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.03)',
        'card-hover':
          '0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
        pop: '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.06)',
        focus: '0 0 0 4px rgba(11, 37, 69, 0.12)',
      },
      borderRadius: {
        badge: '9999px',
        'md-plus': '0.55rem',
      },
      letterSpacing: {
        tightest: '-0.035em',
        tight2: '-0.02em',
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'slide-up': {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
        'slide-up': 'slide-up 0.35s ease-out both',
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [
    function ({ addVariant, addUtilities }) {
      addVariant('group-has-focus-within', ':merge(.group):focus-within &');
      addUtilities({
        '.tabular': { fontVariantNumeric: 'tabular-nums' },
        '.ring-focus': {
          outline: 'none',
          boxShadow: '0 0 0 4px rgba(11, 37, 69, 0.12)',
          borderColor: '#2a4365',
        },
        '.no-scrollbar': {
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        },
        '.no-scrollbar::-webkit-scrollbar': { display: 'none' },
        '.bg-skeleton': {
          background:
            'linear-gradient(90deg, #f1f1ef 0%, #f8f7f6 50%, #f1f1ef 100%) 0 0 / 800px 100% no-repeat',
        },
      });
    },
  ],
};
