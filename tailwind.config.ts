import type { Config } from 'tailwindcss';

/**
 * The storefront's design system - and deliberately nothing like the ops
 * console's.
 *
 * The console is a cool grey instrument panel: dense, quiet, built to be
 * read for eight hours. This is a shop. It is warm, it has air, the food is
 * the loudest thing on the screen, and the only strong colour belongs to
 * the button that adds something to a basket.
 *
 * Green is the primary because it reads as fresh produce in India without
 * anyone having to be told, and it is not the blue that every delivery app
 * uses. Terracotta is the accent, used sparingly and never next to green at
 * full strength - it is for prices that dropped and slots that are filling.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* page and panels */
        cream:   '#FFFCF7',
        surface: '#FFFFFF',
        sand:    '#F7F1E7',
        line:    '#EDE4D6',
        'line-strong': '#DCCFBB',

        /* text */
        ink: {
          DEFAULT: '#1B1714',
          soft:    '#5A524B',
          muted:   '#8B8179',
          faint:   '#B0A69C',
        },

        /* the brand: fresh, not fluorescent */
        leaf: {
          DEFAULT: '#12764A',
          dark:    '#0C5B38',
          soft:    '#E7F4ED',
          line:    '#B9DECB',
        },

        /* used for offers, urgency, and nothing else */
        carrot: {
          DEFAULT: '#D9552A',
          soft:    '#FDEDE5',
          line:    '#F5CDB8',
        },

        berry:  { DEFAULT: '#A62A55', soft: '#FBE9EF' },
        sun:    { DEFAULT: '#B07C10', soft: '#FCF3DF' },
      },

      fontFamily: {
        /* Outfit has round, open counters - it looks friendly at large
           sizes without turning cartoonish, which is the failure mode of
           most "friendly" faces. */
        display: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:    ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
      },

      borderRadius: {
        card: '18px',
        tile: '14px',
        pill: '999px',
      },

      boxShadow: {
        /* Soft and warm rather than neutral grey - a cold shadow on a cream
           page looks like a rendering bug. */
        card:  '0 1px 2px rgba(60, 40, 20, 0.05), 0 2px 8px -4px rgba(60, 40, 20, 0.06)',
        lift:  '0 6px 20px -6px rgba(60, 40, 20, 0.16), 0 2px 6px -2px rgba(60, 40, 20, 0.08)',
        sheet: '0 -8px 40px -12px rgba(30, 20, 10, 0.22)',
      },

      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-in': {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up':  'fade-up 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        'sheet-in': 'sheet-in 260ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
