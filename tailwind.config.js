/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#4F46E5', hover: '#4338CA', light: '#EEF2FF' },
        danger:  { DEFAULT: '#DC2626', light: '#FEF2F2' },
        success: { DEFAULT: '#16A34A', light: '#F0FDF4' },
        warning: { DEFAULT: '#D97706', light: '#FFFBEB' },
      }
    }
  },
  plugins: [],
}
