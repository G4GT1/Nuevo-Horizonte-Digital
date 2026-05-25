/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        card: 'rgb(var(--c-card) / <alpha-value>)',
        'card-hover': 'rgb(var(--c-card-hover) / <alpha-value>)',
        border: 'rgb(var(--c-border) / <alpha-value>)',
        'border-subtle': 'rgb(var(--c-border-subtle) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--c-primary) / <alpha-value>)',
          dark: 'rgb(var(--c-primary-dark) / <alpha-value>)',
          light: 'rgb(var(--c-primary-light) / <alpha-value>)',
          muted: 'rgb(var(--c-primary-muted) / <alpha-value>)',
        },
        text: {
          DEFAULT: 'rgb(var(--c-text) / <alpha-value>)',
          muted: 'rgb(var(--c-text-muted) / <alpha-value>)',
          subtle: 'rgb(var(--c-text-subtle) / <alpha-value>)',
        },
        warn: 'rgb(var(--c-warn) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
        info: 'rgb(var(--c-info) / <alpha-value>)',
      },
      backgroundImage: {
        'grid-pattern': 'radial-gradient(circle, rgb(var(--c-border)) 1px, transparent 1px)',
        'hero-glow': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgb(var(--c-primary) / 0.15), transparent)',
      },
      boxShadow: {
        glow: '0 0 20px rgb(var(--c-primary) / 0.15)',
        'glow-lg': '0 0 40px rgb(var(--c-primary) / 0.2)',
        card: '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in': 'fadeIn 0.3s ease forwards',
        'slide-up': 'slideUp 0.4s ease forwards',
        'meteor': 'meteor 5s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        meteor: {
          '0%': { transform: 'rotate(215deg) translateX(0)', opacity: '1' },
          '70%': { opacity: '1' },
          '100%': { transform: 'rotate(215deg) translateX(-500px)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
