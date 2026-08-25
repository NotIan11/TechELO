import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surfaces — near-black ladder
        ink: {
          950: '#050505',
          900: '#0b0b0c',
          800: '#121214',
          700: '#19191c',
          600: '#232328',
        },
        // Hairlines
        line: 'rgba(255, 255, 255, 0.08)',
        'line-strong': 'rgba(255, 255, 255, 0.14)',
        // Caltech orange (PMS 1585) — the single accent. Partial override; other stops stay default.
        orange: {
          400: '#FF8A3D',
          500: '#FF6C0C',
          600: '#E85D00',
        },
        // Semantics (used at low opacity for chips/bars, full for text)
        win: '#3DDC97',
        loss: '#FF5C5C',
        warn: '#FFB020',
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        // Controls. Cards use 2xl (16px), panels 3xl (24px). `rounded-xl` is not part of the system.
        lg: '10px',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'fade-in': 'fade-in 0.3s ease-out both',
      },
    },
  },
  plugins: [],
}
export default config
